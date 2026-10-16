const express = require("express");
const { listActiveProducts } = require("../products/products.services");

const router = express.Router();

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildUrlEntry(loc, lastmod = null) {
    const lines = [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
    ];

    if (lastmod) {
        const date = new Date(lastmod);

        if (!Number.isNaN(date.getTime())) {
            lines.push(
                `    <lastmod>${date.toISOString()}</lastmod>`
            );
        }
    }

    lines.push("  </url>");

    return lines.join("\n");
}

router.get("/sitemap.xml", async (req, res) => {
    try {
        const siteUrl = String(
            process.env.PUBLIC_SITE_URL || ""
        )
            .trim()
            .replace(/\/+$/, "");

        const products = await listActiveProducts();

        const urls = [
            buildUrlEntry(`${siteUrl}/`),
            buildUrlEntry(`${siteUrl}/shop`),

            ...products
                .filter((product) => product?._id)
                .map((product) =>
                    buildUrlEntry(
                        `${siteUrl}/shop/product/${encodeURIComponent(
                            String(product._id)
                        )}`,
                        product.updatedAt
                    )
                ),
        ];

        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...urls,
            "</urlset>",
            "",
        ].join("\n");

        return res
            .status(200)
            .type("application/xml")
            .set(
                "Cache-Control",
                "public, max-age=0, s-maxage=3600"
            )
            .send(xml);
    } catch (err) {
        console.error("SITEMAP_ERROR:", err);

        return res
            .status(500)
            .type("text/plain")
            .send("Sitemap unavailable");
    }
});

module.exports = router;