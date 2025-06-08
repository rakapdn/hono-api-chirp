import { Hono } from "hono";
import { getImageList, getImageByFileName, uploadImage } from "../handlers/image.handler";

const imageRoutes = new Hono();

imageRoutes.get("/", getImageList);
imageRoutes.get("/:filename", getImageByFileName);
imageRoutes.post("/upload", uploadImage); // Endpoint baru untuk upload gambar

export default imageRoutes;
