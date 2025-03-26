import { deductNumCallsToken } from "../../utils/useDatabase";

export default async function handler(req, res) {
  try {
    const { user } = req.query;
    if (!user) {
      res.status(403).json({
        error: "UserId is empty",
      });
    }
    let result = await deductNumCallsToken(user, 1);
    if (result) {
      res.json(result.data);
    } else {
      res.status(403).json({
        error: "User doesnothave permission",
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error,
    });
  }
}
