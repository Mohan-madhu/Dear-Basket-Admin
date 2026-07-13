import { API } from "../../../App_Utils/Services/APIService";

const queryString = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

export const complaintChatApi = {
  async getConversation({ userid, readerid, readerrole }) {
    const query = queryString({ readerid, readerrole });
    return API.GET_FRESH(
      `DailyMilkComplaint/user/${encodeURIComponent(userid)}?${query}`
    );
  },

  async getAdminConversations({ adminid, search = "" }) {
    const query = queryString({ adminid, search });
    return API.GET_FRESH(`DailyMilkComplaint/admin/conversations?${query}`);
  },

  async sendMessage({ userid, senderid, senderrole, message }) {
    return API.POST("DailyMilkComplaint/message", {
      userid,
      senderid,
      senderrole,
      message,
    });
  },

  async markRead({ userid, readerid, readerrole }) {
    return API.PUT("DailyMilkComplaint/read", {
      userid,
      readerid,
      readerrole,
    });
  },
};
