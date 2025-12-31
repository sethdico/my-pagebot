const axios = require("axios");

module.exports = function (event) {
  return async function getUserInfo(id) {
    const uid = id || event.sender.id;
    try {
      // only ask for what we need. 
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${uid}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`
      );
      
      if (!res.data || res.data.error) return null;

      return {
        name: `${res.data.first_name || "fb"} ${res.data.last_name || "user"}`.trim(),
        pic: res.data.profile_pic
      };
    } catch (e) {
      return null;
    }
  };
};
