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
 * 设置钉钉地址转换功能
 */
function setupDingTalkConverter() {
  const convertBtn = document.getElementById('convert-btn');
  const copyResultBtn = document.getElementById('copy-result-btn');
  const openResultBtn = document.getElementById('open-result-btn');

  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      const input = document.getElementById('url-input').value.trim();
      const output = document.getElementById('converted-result');
      const urlType = document.querySelector('input[name="url-type"]:checked').value;

      if (!input) {
        alert('请输入需要转换的地址!');
        return;
      }

      try {
        let result = '';

        if (input.startsWith('http')) {
          // 网页链接转钉钉链接
          const encodedUrl = encodeURIComponent(input);
          if (urlType === 'workbench') {
            result = `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(input + '&ddtab=true')}`;
          } else {
            result = `dingtalk://dingtalkclient/page/link?url=${encodedUrl}&pc_slide=true`;
          }
        } else {
          alert('不支持的链接格式');
          return;
        }

        output.value = result;
        alert('地址转换成功');
      } catch (error) {
        alert(`转换出错: ${error.message}`);
        console.error('地址转换出错:', error);
      }
    });
  }

  if (copyResultBtn) {
    copyResultBtn.addEventListener('click', () => {
      const result = document.getElementById('converted-result').value;
      if (result) {
        copyToClipboard(result).then(
          () => alert('复制成功'),
          err => alert(`复制失败: ${err.message}`)
        );
      } else {
        alert('没有可复制的内容');
      }
    });
  }

  if (openResultBtn) {
    openResultBtn.addEventListener('click', () => {
      const result = document.getElementById('converted-result').value;
      if (result) {
        try {
          window.open(result, '_blank');
        } catch (error) {
          alert(`打开链接失败: ${error.message}`);
          console.error('打开链接失败:', error);
        }
      } else {
        alert('没有可打开的链接');
      }
    });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  setupDingTalkConverter();
});
