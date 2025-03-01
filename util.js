/**
 * 截取指定子字符串之后的部分
 *
 * @param inputString
 * @param substring
 * @returns {string}
 */
function extractDataAfterSubstring(inputString, substring) {
  // 找到指定子字符串在主字符串中的位置
  const index = inputString.indexOf(substring);

  // 如果找到了该子字符串
  if (index !== -1) {
    // 截取从该子字符串之后的部分
    return inputString.substring(index + substring.length);
  }
  // 如果未找到，返回空字符串或其他默认值
  return '';
}

module.exports = {
  extractDataAfterSubstring,
};