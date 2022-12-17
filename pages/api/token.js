import axios from "axios";
import token from "../../websocket/AAIToken";

export default async function handler(req, res) {
  try {
    const response = await axios.post(
      "https://api.assemblyai.com/v2/realtime/token", // use account token to get a temp user token
      { expires_in: 3600 }, // can set a TTL timer in seconds.
      { headers: { authorization: token } }
    ); // AssemblyAI API Key goes here
    const { data } = response;
    console.log("DATA CALLED");
    res.json(data);
  } catch (error) {
    const {
      response: { status, data },
    } = error;
    console.log("ERROR::", data.error);
    res.status(status).json(data);
  }
}
