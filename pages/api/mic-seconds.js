import { deductUserMicToken } from "../../utils/useDatabase";

export default async function handler(req, res) {
  const { user } = req.query;
  let result = await deductUserMicToken(user, 1);
  if (result) {
    res.json(result.data);
  } else {
    res.status(403).json({
      error: "User doesnothave permission",
    });
  }
}
