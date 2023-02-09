import migrateFirebaseData from "../../lib/migrate";

export default function handler(req, res) {
    migrateFirebaseData()
    res.status(200).json({ name: "John Doe" });
}
