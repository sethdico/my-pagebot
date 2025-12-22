const axios = require("axios")

/**
 * Shared utilities for AI commands to reduce code duplication
 */

// Response extractor - handles multiple API response formats
function extractResponse(data) {
  return data.response || data.result || data.answer || data.message || data.text || data.content || ""
}

// Safe API call wrapper with timeout and error handling
async function safeApiCall(url, params = {}, timeout = 30000) {
  try {
    const response = await axios.get(url, {
      params,
      timeout,
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isTimeout: error.code === "ECONNABORTED",
    }
  }
}

// Format AI response with consistent styling
function formatAIResponse(title, content, model = "") {
  const modelText = model ? ` (${model})` : ""
  return `${title}${modelText}\n━━━━━━━━━━━━━━━━\n${content}\n━━━━━━━━━━━━━━━━`
}

// Stream decoder for Quillbot-style responses
function decodeStreamResponse(rawStream) {
  if (!rawStream || !rawStream.includes("event: output_done")) {
    return null
  }

  try {
    const splitStream = rawStream.split("event: output_done")
    const dataPart = splitStream[1].split("data: ")[1]
    const jsonString = dataPart.split("event: status")[0].trim()
    const parsedData = JSON.parse(jsonString)
    return parsedData.text || null
  } catch (e) {
    return null
  }
}

// Typing indicator wrapper
async function withTyping(senderID, callback, api) {
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID)
  try {
    await callback()
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID)
  }
}

module.exports = {
  extractResponse,
  safeApiCall,
  formatAIResponse,
  decodeStreamResponse,
  withTyping,
}
