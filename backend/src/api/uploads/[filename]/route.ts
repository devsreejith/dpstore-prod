import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"
import { getUploadDirAbsolute } from "../../v1/_shared/helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const filename = String(req.params.filename ?? "").trim()
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).send("Invalid filename")
    return
  }

  const uploadDirAbs = getUploadDirAbsolute()
  const absPath = path.join(uploadDirAbs, filename)

  if (!absPath.toLowerCase().startsWith(uploadDirAbs.toLowerCase())) {
    res.status(400).send("Invalid path")
    return
  }

  if (!fs.existsSync(absPath)) {
    res.status(404).send("Not Found")
    return
  }

  res.sendFile(absPath)
}
