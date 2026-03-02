const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// --- 🎬 [NEW] TheNkiri Movie Scraper API ---
// --- 🔍 1. Search API (ලිස්ට් එකක් ලබා ගැනීමට) ---
app.get('/api/search', async (req, res) => {
    let { text } = req.query;
    if (!text) return res.status(400).json({ status: false, message: "Search නමක් ලබා දෙන්න." });

    try {
        const searchUrl = `https://thenkiri.com/?s=${encodeURIComponent(text)}&post_type=post`;
        const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(data);

        let results = [];
        // මූවීස් 10ක් දක්වා ලිස්ට් එක ගමු
        $('article').slice(0, 10).each((i, el) => {
            const title = $(el).find('.entry-title a').text().trim();
            const link = $(el).find('.entry-title a').attr('href');
            const img = $(el).find('img').attr('src');

            if (link) {
                results.push({
                    index: i + 1,
                    title: title,
                    url: link,
                    thumbnail: img
                });
            }
        });

        res.json({ status: true, results });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

// --- 🎬 2. Direct Link API (තෝරාගත් මූවී එකේ ලින්ක් එක හරහා) ---
app.get('/api/thenkiri', async (req, res) => {
    let { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: "URL එකක් ලබා දෙන්න." });

    try {
        const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(response.data);
        const title = $('h1.entry-title').text().trim();
        const thumbnail = ($('meta[property="og:image"]').attr('content') || "").trim();
        
        const rawLinks = [];
        $('a[href*="downloadwella.com"]').each((i, el) => {
            rawLinks.push({ quality: $(el).text().trim(), link: $(el).attr('href') });
        });

        let dlLinks = [];
        for (let item of rawLinks) {
            try {
                const pageRes = await axios.get(item.link, { headers: { 'User-Agent': USER_AGENT } });
                const $dlPage = cheerio.load(pageRes.data);
                const formData = new URLSearchParams();
                
                $dlPage('form input').each((i, input) => {
                    const name = $dlPage(input).attr('name');
                    const value = $dlPage(input).attr('value');
                    if (name) formData.append(name, value || '');
                });

                const postRes = await axios.post(item.link, formData.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': USER_AGENT,
                        'Referer': item.link,
                        'Cookie': pageRes.headers['set-cookie'] ? pageRes.headers['set-cookie'].join('; ') : ''
                    }
                });

                const $final = cheerio.load(postRes.data);
                const directLink = $final('a[href*="downloadwella.com/d/"]').attr('href');

                dlLinks.push({
                    quality: item.quality,
                    direct_link: directLink || item.link
                });
            } catch (err) {
                dlLinks.push({ quality: item.quality, direct_link: item.link });
            }
        }
        res.json({ status: true, title, thumbnail, links: dlLinks });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

// --- 📸 Instagram API ---
app.get('/api/insta', async (req, res) => {
    let { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: "URL එකක් ලබා දෙන්න." });

    try {
        const response = await axios({
            method: 'post',
            url: 'https://api.instasave.website/media',
            data: new URLSearchParams({ url: url }).toString(),
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://instasave.website',
                'referer': 'https://instasave.website/',
                'user-agent': USER_AGENT,
            }
        });

        const tokenRegex = /https:\/\/cdn\.instasave\.website\/\?token=[a-zA-Z0-9._-]+/g;
        const matches = response.data.match(tokenRegex);

        if (matches && matches.length >= 2) {
            const uniqueLinks = [...new Set(matches)];
            return res.json({
                status: true,
                thumbnail: uniqueLinks[0],
                downloadUrl: uniqueLinks[uniqueLinks.length - 1]
            });
        }
        res.status(404).json({ status: false, message: "Media not found." });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

// --- 🤖 DeepAI Chat API (Scraped Logic) ---
app.get('/api/deepchat', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.status(400).json({ status: false, message: "Prompt එකක් ලබා දෙන්න." });

    try {
        // Form data එකක් විදිහට payload එක හදනවා
        const params = new URLSearchParams();
        params.append('chat_style', 'chat');
        params.append('chatHistory', JSON.stringify([{ role: 'user', content: text }]));
        params.append('model', 'standard');
        params.append('session_uuid', '5857c2d1-e5b9-4165-beb6-a242e354788c');
        params.append('hacker_is_stinky', 'very_stinky');

        const response = await axios({
            method: 'POST',
            url: 'https://api.deepai.org/hacking_is_a_serious_crime',
            headers: {
                'api-key': 'tryit-77318428809-3d7b57af319cc19387a77a13885d6851',
                'User-Agent': USER_AGENT,
                'Referer': 'https://deepai.org/chat',
                'Origin': 'https://deepai.org',
                'Content-Type': 'application/x-www-form-urlencoded', // JSON නෙවෙයි Form data ඕනේ
                'x-requested-with': 'XMLHttpRequest'
            },
            data: params.toString()
        });

        // Response එකේ එන්නේ කෙලින්ම text එක නම් ඒක දෙනවා
        return res.json({
            status: true,
            prompt: text,
            result: response.data
        });
    } catch (e) {
        const errorData = e.response ? e.response.data : e.message;
        res.status(500).json({ 
            status: false, 
            error: "AI Chat failed", 
            details: errorData 
        });
    }
});
// --- 🚀 Server Setup ---
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}

module.exports = app;

