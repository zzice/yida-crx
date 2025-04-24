/**
 * 宜搭开发助手 Content Script
 * 版本: 1.0.0
 * 功能: 为宜搭低代码平台设计器提供实用工具、常用代码片段和组件
 */

// 记录器：统一日志记录，便于调试
const logger = {
  info: (message, ...args) => console.info(`[YIDA助手] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[YIDA助手] ${message}`, ...args),
  error: (message, ...args) => console.error(`[YIDA助手] ${message}`, ...args),
  debug: (message, ...args) => console.debug(`[YIDA助手] ${message}`, ...args)
};

// 初始化Content Script
logger.info('Content Script 初始化中');

// 助手工具类：封装实用功能
const YidaHelper = {
  /**
   * 等待元素加载，返回Promise实例
   * @param {string} selector - CSS选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<Element>} 匹配的DOM元素
   */
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      // 先尝试直接获取元素
    const element = document.querySelector(selector);
    if (element) {
        resolve(element);
      return;
    }

      // 设置超时处理
      const timeoutId = setTimeout(() => {
      if (observer) {
        observer.disconnect();
      }
        reject(new Error(`等待元素 "${selector}" 超时 (${timeout}ms)`));
    }, timeout);

      // 使用MutationObserver监听DOM变化
      const observer = new MutationObserver((mutations, obs) => {
      const targetElement = document.querySelector(selector);
      if (targetElement) {
          clearTimeout(timeoutId);
          obs.disconnect();
          resolve(targetElement);
        }
      });

      // 观察整个body的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    });
  },

  /**
   * 显示toast提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒）
   */
  showToast(message, duration = 2000) {
    // 获取或创建toast元素
    let toast = document.getElementById('yida-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'yida-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    // 设置消息并显示
    toast.textContent = message;
    toast.classList.add('show');

    // 定时隐藏
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  /**
   * 安全地存储设置到chrome.storage
   * @param {Object} data - 要存储的数据
   * @returns {Promise<void>}
   */
  async saveSettings(data) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * 从chrome.storage读取设置
   * @param {string[]} keys - 要读取的键
   * @returns {Promise<Object>} 存储的数据
   */
  async getSettings(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * 创建元素并设置属性
   * @param {string} tag - 元素标签名
   * @param {Object} attributes - 属性对象
   * @param {string|Element} [content] - 内容或子元素
   * @returns {HTMLElement} 创建的元素
   */
  createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);

    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // 添加内容
    if (content) {
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else if (content instanceof Element) {
        element.appendChild(content);
      }
    }

    return element;
  }
};

// 声明数据变量
let commonCodeData = [];
let componentsData = { form: [], advanced: [] };

/**
 * 加载数据文件
 * @returns {Promise<void>}
 */
async function loadDataFiles() {
  try {
    // 加载commonCodeData
    const commonCodeResponse = await fetch(chrome.runtime.getURL('content/data/commonCodeData.json'));
    commonCodeData = await commonCodeResponse.json();
    logger.info('成功加载commonCodeData数据');

    // 加载componentsData
    const componentsResponse = await fetch(chrome.runtime.getURL('content/data/componentsData.json'));
    componentsData = await componentsResponse.json();
    logger.info('成功加载componentsData数据');
  } catch (error) {
    logger.error('加载数据文件失败:', error);
  }
}

/**
 * 检查当前URL是否匹配宜搭设计器页面模式
 * @returns {boolean} 是否为宜搭设计器页面
 */
function isDesignerPage() {
  const url = window.location.href;
  // 匹配 *.aliwork.com/alibaba/web/*/design/pageDesigner 格式的URL
  const designerPagePattern = /^https?:\/\/[\w.-]+\.aliwork\.com\/alibaba\/web\/[^\/]+\/design\/pageDesigner/;
  return designerPagePattern.test(url);
}

// 主程序入口：只在设计器页面执行脚本
if (!isDesignerPage()) {
  logger.info('不是宜搭设计器页面，content script不执行');
} else {
  logger.info('检测到宜搭设计器页面，开始执行content script');

  // 先加载数据文件，然后初始化UI
  loadDataFiles().then(() => {
    // 等待页面加载完成后添加按钮
    window.addEventListener('load', () => {
      // 延迟执行，确保DOM已完全加载
      setTimeout(addSubmitPageButton, 1000);
      
      // 初始化助手界面
      setTimeout(createYidaAssistant, 1500);
    });
    
    // 如果页面已经加载完成，直接初始化
    if (document.readyState === 'complete') {
      setTimeout(createYidaAssistant, 1000);
      setTimeout(addSubmitPageButton, 1000);
    }
  }).catch(error => {
    logger.error('加载数据文件失败，无法继续初始化:', error);
  });

  /**
   * 添加提交页按钮到顶部区域右侧
   */
  function addSubmitPageButton() {
    // 查找目标容器
    const targetSelector = '#engine > div > div.lc-top-area.engine-actionpane.lc-area-visible > div.lc-top-area-right';

    YidaHelper.waitForElement(targetSelector)
      .then(targetContainer => {
        // 创建按钮容器
        const buttonContainer = YidaHelper.createElement('div', {
          className: 'engine-actionitem'
        });

        // 创建按钮
        const submitButton = YidaHelper.createElement('button', {
          'data-dir': 'bottom',
          'data-tip': '提交页',
          'type': 'button',
          className: 'next-btn next-medium next-btn-normal'
        }, '<span class="next-btn-helper">提交页</span>');

        // 组装按钮
        buttonContainer.appendChild(submitButton);

        // 添加到目标容器
        targetContainer.appendChild(buttonContainer);

        // 添加点击事件
        submitButton.addEventListener('click', handleSubmitButtonClick);

        logger.info('提交页按钮已添加');
      })
      .catch(error => {
        logger.warn('未找到目标容器，无法添加提交页按钮', error);
      });
  }

  /**
   * 处理提交页按钮点击事件
   * @param {Event} event - 点击事件对象
   */
  function handleSubmitButtonClick(event) {
    try {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      const origin = url.origin;
      const pathname = url.pathname;
      const searchParams = url.searchParams;

      // 提取 appType (通常格式 /alibaba/web/APP_XXX/...)
      const appTypeMatch = pathname.match(/APP_[A-Z0-9]+/);
      const appType = appTypeMatch ? appTypeMatch[0] : null;

      // 提取 formUuid (首先检查查询参数，然后检查路径段)
      let formUuid = extractFormUuid(searchParams, pathname);

      // 构建并打开提交页URL
      if (origin && appType && formUuid) {
        // 新基础URL结构: ${origin}/${appType}/submission/${formUuid}
        const submitPageUrl = `${origin}/${appType}/submission/${formUuid}`;

        logger.info('正在打开提交页:', submitPageUrl);
        window.open(submitPageUrl, '_blank');
      } else {
        // 如果无法提取必要信息，使用备用逻辑
        logger.error('无法从URL中提取必要信息，使用备用逻辑', { origin, appType, formUuid });
        useFallbackUrlLogic(currentUrl);
      }
    } catch (error) {
      logger.error('处理提交按钮URL时出错:', error);
      YidaHelper.showToast('无法生成提交页链接，请检查当前页面URL');
    }
  }

  /**
   * 从URL中提取表单UUID
   * @param {URLSearchParams} searchParams - URL搜索参数
   * @param {string} pathname - URL路径
   * @returns {string|null} 表单UUID
   */
  function extractFormUuid(searchParams, pathname) {
    // 首先检查查询参数 'formUuid'
    let formUuid = searchParams.get('formUuid');

    // 然后检查 'edit', 'view' 参数
    if (!formUuid) {
      const editMatch = searchParams.get('edit');
      const viewMatch = searchParams.get('view');

      if (editMatch && editMatch.startsWith('FORM-')) {
        formUuid = editMatch;
      } else if (viewMatch && viewMatch.startsWith('FORM-')) {
        formUuid = viewMatch;
      }
    }

    // 如果在参数中找不到，尝试从路径中提取
    if (!formUuid) {
      const pathSegments = pathname.split('/');
      formUuid = pathSegments.find(segment => segment.startsWith('FORM-'));
    }

    return formUuid;
  }

  /**
   * 使用备用URL逻辑创建提交页链接
   * @param {string} currentUrl - 当前URL
   */
  function useFallbackUrlLogic(currentUrl) {
    let fallbackUrl = currentUrl;

    // 移除 edit 或 view 参数
    if (fallbackUrl.includes('edit=') || fallbackUrl.includes('view=')) {
      fallbackUrl = fallbackUrl.replace(/[?&](edit|view)=[^&]+/g, '');

      // 确保移除参数后URL格式正确
      if (fallbackUrl.endsWith('?')) {
        fallbackUrl = fallbackUrl.slice(0, -1);
      }

      fallbackUrl += (fallbackUrl.includes('?') ? '&' : '?') + 'submit=true';
    } else {
      // 如果没有edit/view参数，直接添加submit=true
      fallbackUrl += (fallbackUrl.includes('?') ? '&' : '?') + 'submit=true';
    }

    logger.warn('使用备用URL逻辑:', fallbackUrl);
    window.open(fallbackUrl, '_blank');
  }

  /**
   * 创建宜搭助手界面
   * 包括悬浮球按钮和弹出面板
   */
  function createYidaAssistant() {
    try {
      // 创建UI组件
      const { floatingBall, popup, toast, style } = createUIElements();

      // 确保DOM已经准备好
      if (document.body && document.head) {
        // 添加样式到head
        document.head.appendChild(style);

        // 添加UI元素到body
        document.body.appendChild(floatingBall);
        document.body.appendChild(popup);
        document.body.appendChild(toast);

        // 绑定事件与功能
        bindEventHandlers(floatingBall, popup, toast);

        // 初始化功能
        initializeFeatures(popup);

        logger.info('宜搭助手UI已创建');
      } else {
        logger.error('DOM尚未准备好，无法添加UI元素');
        // 稍后重试
        setTimeout(createYidaAssistant, 500);
      }
    } catch (error) {
      logger.error('创建宜搭助手UI时出错:', error);
    }
  }

  /**
   * 创建所有UI元素
   * @returns {Object} 包含创建的UI元素
   */
  function createUIElements() {
    // 创建样式
    const style = createStyleElement();

    // 创建悬浮球
    const floatingBall = createFloatingBall();

    // 创建弹出面板
    const popup = createPopup();

    // 创建Toast提示
    const toast = YidaHelper.createElement('div', {
      id: 'yida-toast',
      className: 'toast'
    });

    return { floatingBall, popup, toast, style };
  }

  /**
   * 创建悬浮球元素
   * @returns {HTMLElement} 悬浮球元素
   */
  function createFloatingBall() {
    const floatingBall = YidaHelper.createElement('div', {
      id: 'yida-floating-ball'
    }, `
    <div class="floating-ball-icon">
      <svg t="1744991689677" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2982" width="24" height="24"><path d="M0 534.383213V895.328504q0 6.2673 0.63952 12.534599t1.790657 12.406695q1.279041 6.139395 3.069698 12.150886 1.854609 6.075443 4.220834 11.831127 2.430177 5.819635 5.371971 11.383463 2.941794 5.499875 6.459156 10.743942 3.517362 5.244067 7.482388 10.104421 3.965026 4.860355 8.441669 9.273045 4.476643 4.476643 9.273045 8.441669 4.860355 3.965026 10.104422 7.482388 5.244067 3.45341 10.743942 6.395204 5.563827 3.005746 11.383462 5.435923 5.755683 2.366225 11.767175 4.220834 6.011491 1.790657 12.150887 3.069698 6.203347 1.215089 12.470647 1.790657 6.2673 0.63952 12.534599 0.639521h107.823133v-353.718711L0 534.383213z m0-211.937048c3.581314 1.279041 7.034724 2.941794 10.36023 4.924307l314.452161 181.431926 314.835873-180.984262a60.498626 60.498626 0 0 1 82.370222 21.871597l32.551586 56.277791a59.923058 59.923058 0 0 1-22.575068 81.98651l-313.301024 180.536598V1023.232576H895.328504q6.2673 0 12.534599-0.639521t12.406695-1.790657q6.139395-1.279041 12.150886-3.069698 6.075443-1.854609 11.831127-4.220834 5.819635-2.430177 11.383463-5.371971 5.499875-2.941794 10.743942-6.459156 5.244067-3.517362 10.104421-7.482388 4.860355-3.965026 9.273045-8.441669 4.476643-4.476643 8.441669-9.273045 3.965026-4.860355 7.482388-10.104421 3.45341-5.244067 6.395204-10.743942 3.005746-5.563827 5.435923-11.383463 2.366225-5.755683 4.220834-11.767174 1.790657-6.075443 3.069698-12.150887 1.215089-6.203347 1.790657-12.470647 0.63952-6.2673 0.639521-12.534599V127.904072q0-6.2673-0.639521-12.534599t-1.790657-12.406695q-1.279041-6.203347-3.069698-12.150887-1.854609-6.075443-4.220834-11.831127-2.430177-5.819635-5.371971-11.383462-2.941794-5.499875-6.459156-10.743942-3.517362-5.244067-7.482388-10.104422-3.965026-4.860355-8.441669-9.273045-4.476643-4.476643-9.273045-8.441669-4.860355-3.965026-10.104421-7.482388-5.244067-3.517362-10.743942-6.395203-5.563827-3.005746-11.383463-5.435924-5.755683-2.366225-11.767174-4.220834-6.075443-1.790657-12.150887-3.069698-6.203347-1.215089-12.470647-1.790657Q901.595803 0 895.328504 0H127.904072q-6.2673 0-12.534599 0.63952T102.962778 2.430177q-6.203347 1.279041-12.150887 3.069698-6.075443 1.854609-11.831127 4.220834-5.819635 2.430177-11.383462 5.371971Q62.097427 18.034474 56.917312 21.551836 51.609293 25.069198 46.684986 29.034224 41.888584 32.999251 37.475893 37.475893 32.999251 41.952536 29.034224 46.684986 25.069198 51.609293 21.551836 56.917312q-3.517362 5.244067-6.395203 10.743942-3.005746 5.563827-5.435924 11.383462-2.366225 5.755683-4.220834 11.767175-1.790657 6.011491-3.069698 12.150887-1.215089 6.203347-1.790657 12.470647Q0 121.636772 0 127.904072v194.542093z" p-id="2983" fill="#fb1e1e"></path></svg>
    </div>
  `);

    return floatingBall;
  }

  /**
   * 创建弹出面板
   * @returns {HTMLElement} 弹出面板元素
   */
  function createPopup() {
    const popup = YidaHelper.createElement('div', {
      id: 'yida-popup'
    });

    // 创建弹窗内容
    popup.innerHTML = `
    <div class="popup-header">
      <span class="popup-title">宜搭开发助手</span>
      <span class="popup-close">&times;</span>
    </div>
    <div class="popup-tabs">
      <div class="tab active" data-tab="components">组件</div>
      <div class="tab" data-tab="common-code">常用代码</div>
      <div class="tab" data-tab="settings">设置</div>
      <div class="tab" data-tab="about">关于</div>
    </div>
    <div class="popup-content">
      <div class="tab-content active" id="components">
        <div class="components-list">
          <div class="component-category">
            <h3>表单组件</h3>
            <div class="component-grid" id="form-components">
              <!-- 表单组件将通过JS动态生成 -->
            </div>
          </div>
          
          <div class="component-category">
            <h3>高级组件</h3>
            <div class="component-grid" id="advanced-components">
              <!-- 高级组件将通过JS动态生成 -->
            </div>
          </div>
        </div>
      </div>
      <div class="tab-content" id="common-code">
        <!-- 代码列表将通过JS动态生成 -->
        <div class="code-list"></div>
      </div>
      <div class="tab-content" id="settings">
        <div class="settings-container">
          <div class="settings-section">
            <h3>界面设置</h3>
            <div class="setting-item">
              <div class="setting-label">
                <span>隐藏宜搭官方悬浮框</span>
                <span class="setting-description">隐藏宜搭页面右下角的官方悬浮按钮</span>
              </div>
              <div class="setting-control">
                <label class="switch">
                  <input type="checkbox" id="hide-yida-float-btn">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>开启schema</span>
                <span class="setting-description">开启schema</span>
              </div>
              <div class="setting-control">
                <label class="switch">
                  <input type="checkbox" id="yida-schema-mode">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tab-content" id="about">
        <div class="about-content">
          <h3>宜搭开发助手</h3>
          <p>版本: 1.0.0</p>
          <p>该扩展旨在提升宜搭开发效率，提供常用代码片段和实用工具。</p>
          <p>如有问题或建议，请联系管理员。</p>
        </div>
      </div>
    </div>
  `;

    return popup;
  }

  /**
   * 创建样式元素，包含所有CSS样式
   * @returns {HTMLElement} 样式元素
   */
  function createStyleElement() {
    const style = document.createElement('style');
    style.textContent = `
    /* 全局容器 */
    #yida-floating-ball {
      position: fixed;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: white;
      color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      right: 10px;
      bottom: 180px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      transition: transform 0.2s, background-color 0.2s;
    }
    
    #yida-floating-ball:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    #yida-floating-ball:active {
      transform: scale(0.95);
      background-color: #f5f5f5;
    }
    
    .floating-ball-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* 弹出面板 */
    #yida-popup {
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      width: 500px;
      height: 650px;
      display: none;
      flex-direction: column;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s, transform 0.2s;
      overflow: hidden;
      right: 80px;
      bottom: 80px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      color: #333;
    }
    
    #yida-popup.visible {
      display: flex;
      opacity: 1;
      transform: translateY(0);
    }
    
    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: #1e40af;
      color: white;
      cursor: move;
      user-select: none;
    }
    
    .popup-title {
      font-weight: bold;
      font-size: 16px;
    }
    
    .popup-close {
      cursor: pointer;
      font-size: 20px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    .popup-close:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    /* 标签页导航 */
    .popup-tabs {
      display: flex;
      border-bottom: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }
    
    .tab {
      padding: 12px 15px;
      cursor: pointer;
      user-select: none;
      text-align: center;
      flex: 1;
      transition: all 0.2s;
      font-size: 14px;
      position: relative;
      color: #4b5563;
      border-bottom: 2px solid transparent;
    }
    
    .tab:hover {
      background-color: #f1f5f9;
      color: #1e40af;
    }
    
    .tab.active {
      border-bottom: 2px solid #1e40af;
      color: #1e40af;
      font-weight: 500;
      background-color: #f1f5f9;
    }
    
    .popup-content {
      flex: 1;
      overflow-y: auto;
      position: relative;
      background-color: #fff;
    }
    
    .tab-content {
      display: none;
      padding: 16px;
      height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
    }
    
    .tab-content.active {
      display: block;
    }
    
    /* ===== 组件列表 ===== */
    .components-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .component-category h3 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 15px;
      color: #4b5563;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
    }
    
    .component-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .component-item {
      display: flex;
      flex-direction: column;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      height: 80px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    
    .component-item:hover {
      background-color: #f1f5f9;
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border-color: #d1d5db;
    }
    
    .component-name {
      font-size: 14px;
      font-weight: 500;
      color: #4b5563;
      margin-bottom: 6px;
    }
    
    .component-description {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
    
    /* ===== 常用代码面板 ===== */
    .code-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .code-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      transition: all 0.2s;
      background-color: #f9fafb;
    }
    
    .code-item:hover {
      border-color: #d1d5db;
    }
    
    .code-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background-color: #f1f5f9;
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid transparent;
    }
    
    .code-title-text {
      font-weight: 500;
      color: #4b5563;
    }
    
    .title-copy-btn {
      background-color: #e5e7eb;
      color: #4b5563;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .title-copy-btn:hover {
      background-color: #d1d5db;
    }
    
    .code-snippet {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }
    
    .code-item.expanded .code-snippet {
      max-height: 500px;
      transition: max-height 0.5s ease-in;
    }
    
    .code-item.expanded .code-title {
      border-bottom-color: #e5e7eb;
    }
    
    .code-snippet-inner {
      padding: 12px;
    }
    
    .code-description {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .code-snippet pre {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
      overflow-x: auto;
      margin: 0;
    }
    
    /* ===== 设置面板 ===== */
    .settings-container {
      padding: 8px 0;
    }
    
    .settings-section {
      margin-bottom: 24px;
    }
    
    .settings-section h3 {
      font-size: 16px;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .setting-label {
      display: flex;
      flex-direction: column;
    }
    
    .setting-label span:first-child {
      font-weight: 500;
      color: #4b5563;
      margin-bottom: 4px;
    }
    
    .setting-description {
      font-size: 12px;
      color: #9ca3af;
    }
    
    /* 开关样式 */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 22px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #d1d5db;
      transition: .3s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 2px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #2563eb;
    }
    
    input:checked + .slider:before {
      transform: translateX(20px);
    }
    
    /* ===== 关于面板 ===== */
    .about-content {
      text-align: center;
      padding: 24px 16px;
    }
    
    .about-content h3 {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 12px;
    }
    
    .about-content p {
      color: #6b7280;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    
    /* Toast提示样式 */
    #yida-toast {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
    }
    
    #yida-toast.show {
      opacity: 1;
      visibility: visible;
    }
  `;

    return style;
  }

  /**
   * 绑定事件处理函数
   */
  function bindEventHandlers(floatingBall, popup, toast) {
    // 设置悬浮球拖拽功能和点击功能
    setupFloatingBallDrag(floatingBall);
    setupFloatingBallClick(floatingBall, popup);

    // 设置弹窗拖拽和关闭功能
    setupPopupDrag(popup);
    setupPopupClose(popup);

    // 设置标签页切换功能
    setupTabSwitching(popup);

    logger.info('事件处理函数已绑定');
  }

  /**
   * 初始化助手功能
   */
  function initializeFeatures(popup) {
    // 渲染常用代码列表
    renderCodeList(popup);

    // 设置组件功能
    setupComponentFeatures(popup);

    // 设置选项与配置
    setupSettings(popup);

    logger.info('助手功能已初始化');
  }

  /**
   * 设置悬浮球的拖拽功能
   * @param {HTMLElement} floatingBall - 悬浮球元素
   */
  function setupFloatingBallDrag(floatingBall) {
    let isDragging = false;
    let offsetX, offsetY;
    let preventClick = false; // 防止拖拽后的点击

    floatingBall.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - floatingBall.getBoundingClientRect().left;
      offsetY = e.clientY - floatingBall.getBoundingClientRect().top;
      e.preventDefault(); // 防止文本选择
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      // 如果移动了，设置preventClick为true
      preventClick = true;

      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;

      // 确保不超出视口边界
      const maxX = window.innerWidth - floatingBall.offsetWidth;
      const maxY = window.innerHeight - floatingBall.offsetHeight;

      floatingBall.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      floatingBall.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
      floatingBall.style.right = 'auto';
      floatingBall.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;

        // 短暂延迟后重置preventClick
        setTimeout(() => {
          preventClick = false;
        }, 300);
      }
    });

    // 存储preventClick变量供点击事件使用
    floatingBall._preventClick = () => preventClick;
  }

  /**
   * 设置悬浮球的点击功能
   * @param {HTMLElement} floatingBall - 悬浮球元素
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupFloatingBallClick(floatingBall, popup) {
    floatingBall.addEventListener('click', (e) => {
        // 如果是拖拽结束，阻止点击事件
      if (floatingBall._preventClick?.()) {
        e.stopPropagation();
        return;
      }

      // 防止事件冒泡
      e.stopPropagation();

      // 切换弹出面板显示状态
      togglePopup(popup);
    });
  }

  /**
   * 切换弹出面板的显示状态
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function togglePopup(popup) {
    const isPopupVisible = popup.classList.contains('visible');

    if (isPopupVisible) {
      popup.classList.remove('visible');
    } else {
      // 重置弹窗位置到默认位置
      popup.style.left = 'auto';
      popup.style.top = 'auto';
      popup.style.right = '80px';
      popup.style.bottom = '80px';

      popup.classList.add('visible');
    }
  }

  /**
   * 设置弹出面板的拖拽功能
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupPopupDrag(popup) {
    let isPopupDragging = false;
    let popupOffsetX, popupOffsetY;

    const popupHeader = popup.querySelector('.popup-header');

    popupHeader.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('popup-close')) return;

      isPopupDragging = true;
      popupOffsetX = e.clientX - popup.getBoundingClientRect().left;
      popupOffsetY = e.clientY - popup.getBoundingClientRect().top;
      popup.style.cursor = 'grabbing';
      e.preventDefault(); // 防止文本选择
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPopupDragging) return;

      const x = e.clientX - popupOffsetX;
      const y = e.clientY - popupOffsetY;

      // 确保不超出视口边界
      const maxX = window.innerWidth - popup.offsetWidth;
      const maxY = window.innerHeight - popup.offsetHeight;

      popup.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      popup.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
      popup.style.right = 'auto';
      popup.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isPopupDragging) {
        popup.style.cursor = 'default';
        isPopupDragging = false;
      }
    });
  }

  /**
   * 设置弹出面板的关闭功能
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupPopupClose(popup) {
    const closeButton = popup.querySelector('.popup-close');
    closeButton.addEventListener('click', () => {
      popup.classList.remove('visible');
    });

    // 点击面板外部关闭
    document.addEventListener('click', (e) => {
      if (popup.classList.contains('visible') &&
        !popup.contains(e.target) &&
        !e.target.closest('#yida-floating-ball')) {
        popup.classList.remove('visible');
      }
    });
  }

  /**
   * 设置标签页切换功能
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupTabSwitching(popup) {
    const tabsContainer = popup.querySelector('.popup-tabs');

    tabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;

      const tabId = tab.dataset.tab;

      // 更新激活的标签
      popup.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
      });
      tab.classList.add('active');

      // 显示对应的内容
      popup.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      popup.querySelector(`#${tabId}`).classList.add('active');
    });
  }

  /**
   * 渲染常用代码列表
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function renderCodeList(popup) {
      const codeList = popup.querySelector('.code-list');
      codeList.innerHTML = '';

      commonCodeData.forEach((codeItem, index) => {
      const codeElement = YidaHelper.createElement('div', {
        className: 'code-item',
        'data-index': index
      });

        codeElement.innerHTML = `
        <div class="code-title">
          <span class="code-title-text">${codeItem.title}</span>
          <button class="title-copy-btn" title="复制代码">复制</button>
        </div>
        <div class="code-snippet">
          <div class="code-snippet-inner">
            <div class="code-description">${codeItem.description || ''}</div>
            <pre>${codeItem.code}</pre>
          </div>
        </div>
      `;

        codeList.appendChild(codeElement);
      });

      // 添加折叠面板事件
    codeList.addEventListener('click', (e) => handleCodeListClick(e, popup));
  }

  /**
   * 处理代码列表的点击事件
   * @param {Event} e - 点击事件对象
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function handleCodeListClick(e, popup) {
      // 处理标题复制按钮点击
      const titleCopyBtn = e.target.closest('.title-copy-btn');
      if (titleCopyBtn) {
        const codeItem = titleCopyBtn.closest('.code-item');
        const index = parseInt(codeItem.dataset.index);
        const codeText = commonCodeData[index].code;

      copyToClipboard(codeText).then(
        () => YidaHelper.showToast('复制成功'),
        err => YidaHelper.showToast(`复制失败: ${err.message}`)
      );

        e.stopPropagation();
        return;
      }

      // 处理标题点击 - 折叠/展开
      const codeTitle = e.target.closest('.code-title');
      if (codeTitle && !e.target.closest('.title-copy-btn')) {
        const codeItem = codeTitle.parentElement;

        // 手风琴效果 - 关闭其他已展开的面板
        const expandedItems = popup.querySelectorAll('.code-item.expanded');
        expandedItems.forEach(item => {
          if (item !== codeItem) {
            item.classList.remove('expanded');
          }
        });

        // 切换当前面板状态
        codeItem.classList.toggle('expanded');

        e.stopPropagation();
        return;
    }
  }

  /**
   * 安全地复制文本到剪贴板
   * @param {string} text - 要复制的文本
   * @returns {Promise<void>}
   */
  function copyToClipboard(text) {
    // 使用现代API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    // 备用方法
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 设置组件功能
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupComponentFeatures(popup) {
      // 渲染组件列表
    renderComponents(popup);

      // 为组件项添加点击事件
    setupComponentEvents(popup);
  }

  /**
   * 渲染组件列表
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function renderComponents(popup) {
      // 渲染表单组件
      const formComponentsContainer = popup.querySelector('#form-components');
      formComponentsContainer.innerHTML = '';

      componentsData.form.forEach((component, index) => {
      const componentElement = YidaHelper.createElement('div', {
        className: 'component-item',
        'data-type': component.type,
        'data-index': index,
        'data-category': 'form'
      });

        componentElement.innerHTML = `
            <div class="component-name">${component.name}</div>
            <div class="component-description">${component.description}</div>
          `;

        formComponentsContainer.appendChild(componentElement);
      });

      // 渲染高级组件
      const advancedComponentsContainer = popup.querySelector('#advanced-components');
      advancedComponentsContainer.innerHTML = '';

      componentsData.advanced.forEach((component, index) => {
      const componentElement = YidaHelper.createElement('div', {
        className: 'component-item',
        'data-type': component.type,
        'data-index': index,
        'data-category': 'advanced'
      });

        componentElement.innerHTML = `
            <div class="component-name">${component.name}</div>
            <div class="component-description">${component.description}</div>
          `;

        advancedComponentsContainer.appendChild(componentElement);
      });
    }

  /**
   * 设置组件点击事件
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupComponentEvents(popup) {
    const componentItems = popup.querySelectorAll('.component-item');

    componentItems.forEach(item => {
      item.addEventListener('click', () => {
        const componentName = item.querySelector('.component-name').textContent;
        const componentType = item.dataset.type;
        const componentIndex = parseInt(item.dataset.index);
        const categoryType = item.dataset.category;

        // 获取对应的组件数据
        const componentData = componentsData[categoryType][componentIndex];

        if (componentData && componentData.schema) {
          // 复制schema数据到剪贴板
          copyToClipboard(componentData.schema).then(
            () => YidaHelper.showToast(`已复制 ${componentName} 组件配置到剪贴板，请粘贴到宜搭表单设计器中`),
            err => YidaHelper.showToast(`复制失败: ${err.message}`)
          );
        } else {
          YidaHelper.showToast(`已选择组件: ${componentName}`);
        }
      });
    });
  }

  /**
   * 设置页面配置
   * @param {HTMLElement} popup - 弹出面板元素
   */
  function setupSettings(popup) {
      const hideYidaFloatBtn = popup.querySelector('#hide-yida-float-btn');
    const yidaSchemaModeCheckbox = popup.querySelector('#yida-schema-mode');

      // 加载设置
    YidaHelper.getSettings(['hideYidaFloatBtn', 'yidaSchemaMode'])
      .then(settings => {
        // 设置隐藏官方悬浮按钮
        if (settings.hideYidaFloatBtn) {
          hideYidaFloatBtn.checked = true;
          hideYidaFloatingButton();
        }

        // 设置schema模式
        const schemaSelector = '.lc-left-area-bottom div:last-child';
        YidaHelper.waitForElement(schemaSelector)
          .then(schemaElement => {
            logger.info('Schema相关元素已找到');

            if (settings.yidaSchemaMode) {
            // 如果 yidaSchemaMode 为 true，则显示元素
            if (yidaSchemaModeCheckbox) yidaSchemaModeCheckbox.checked = true;
            schemaElement.style.display = 'block';
              logger.info('Schema 模式已启用，显示相关元素');
          } else {
            // 如果 yidaSchemaMode 为 false 或未定义，则隐藏元素
            if (yidaSchemaModeCheckbox) yidaSchemaModeCheckbox.checked = false;
            schemaElement.style.display = 'none'; // 确保隐藏
              logger.info('Schema 模式未启用，隐藏相关元素');
            }
          })
          .catch(error => {
            logger.warn('未找到Schema相关元素:', error);
          });
      })
      .catch(error => {
        logger.error('加载设置失败:', error);
      });

    // 隐藏宜搭悬浮按钮设置
    hideYidaFloatBtn.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      YidaHelper.saveSettings({ hideYidaFloatBtn: isChecked })
        .then(() => {
          if (isChecked) {
            hideYidaFloatingButton();
            YidaHelper.showToast('已隐藏宜搭悬浮按钮');
          } else {
            showYidaFloatingButton();
            YidaHelper.showToast('已恢复宜搭悬浮按钮');
          }
        })
        .catch(error => {
          logger.error('保存设置失败:', error);
          YidaHelper.showToast('保存设置失败');
        });
    });

    // Schema模式设置
    yidaSchemaModeCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
      YidaHelper.saveSettings({ yidaSchemaMode: isChecked })
        .then(() => {
        const schemaElement = document.querySelector('.lc-left-area-bottom div:last-child');
        if (schemaElement) {
          if (isChecked) {
            schemaElement.style.display = 'block';
              logger.info('Schema 模式已启用，显示相关元素');
          } else {
            schemaElement.style.display = 'none';
              logger.info('Schema 模式已禁用，隐藏相关元素');
          }
            YidaHelper.showToast(isChecked ? 'Schema模式已启用' : 'Schema模式已禁用');
        }
        })
        .catch(error => {
          logger.error('保存Schema设置失败:', error);
          YidaHelper.showToast('保存设置失败');
      });
    });
    }

  /**
   * 隐藏宜搭悬浮按钮
   */
    function hideYidaFloatingButton() {
    const styleId = 'yida-hide-float-btn-style';

    // 如果已存在，则不重复创建
    if (document.getElementById(styleId)) {
      return;
    }

      const styleElement = document.createElement('style');
    styleElement.id = styleId;
      styleElement.textContent = `
      #yida-admin-common {
        visibility: hidden !important;
      }
    `;
      document.head.appendChild(styleElement);

    logger.info('已隐藏宜搭官方悬浮按钮');
    }

  /**
   * 显示宜搭悬浮按钮
   */
    function showYidaFloatingButton() {
      const styleElement = document.getElementById('yida-hide-float-btn-style');
      if (styleElement) {
        styleElement.remove();
      logger.info('已恢复宜搭官方悬浮按钮');
    }
  }
}