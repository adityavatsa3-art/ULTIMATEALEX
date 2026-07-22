import { coderDir } from "@/lib/env.js"
import { createStorage } from "unstorage"
import fsLiteDriver from "unstorage/drivers/fs-lite"
import mem from "unstorage/drivers/memory"

export const messageStorage = createStorage({
  driver:
    import.meta.env.MODE === "test" ? (mem as any)() : (fsLiteDriver as any)({ base: coderDir }),
})
