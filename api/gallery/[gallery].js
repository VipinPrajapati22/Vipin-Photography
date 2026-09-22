const { getGalleryImages } = require("../../gallery-data");

module.exports = async (request, response) => {
  const galleryName = Array.isArray(request.query.gallery)
    ? request.query.gallery[0]
    : request.query.gallery;
  const images = await getGalleryImages(galleryName);

  if (!images) {
    response.status(404).json({ error: "Gallery not found" });
    return;
  }

  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({ images });
};
