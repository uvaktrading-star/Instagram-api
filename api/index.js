const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();
const yts = require('yt-search');
const crypto = require('crypto');

app.use(cors());
app.use(express.json());
//-----------------anime hevan----------------------
const BASE_URL = 'https://animeheaven.me';

const getHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Cookie': 'key=4290d2719374dd27249ad2886fb0076e;'
});
//------------------------------------------------------------
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const KY = "C5D58EF67A7584E4A29F6C35BBC4EB12";
const is = axios.create({ headers: { "content-type": "application/json", "origin": "https://yt.savetube.me", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0" }});
const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://sinhalasub.lk/'
};

app.get('/api/pastpaper/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "සෙවිය යුතු විෂය හෝ වසර ඇතුළත් කරන්න." });

    try {
        const searchUrl = `https://pastpapers.wiki/?s=${encodeURIComponent(q)}`;
        const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const $ = cheerio.load(response.data);
        let results = [];
        $('.jeg_posts article.jeg_post').each((i, el) => {
            const title = $(el).find('.jeg_post_title a').text().trim();
            const link = $(el).find('.jeg_post_title a').attr('href');
            const img = $(el).find('.thumbnail-container img').attr('src');
            const excerpt = $(el).find('.jeg_post_excerpt p').text().trim();

            if (title && link) {
                results.push({
                    title: title,
                    url: link,
                    thumbnail: img,
                    description: excerpt
                });
            }
        });

        res.json({
            success: true,
            creator: "ZANTA-MD",
            count: results.length,
            results: results
        });

    } catch (e) {
        res.status(500).json({ success: false, error: "PastPaper Search failed: " + e.message });
    }
});

app.get('/api/pastpaper/dl', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: "URL එක ලබා දෙන්න." });
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const $ = cheerio.load(response.data);
        const title = $('.entry-header h1').text().trim() || $('title').text().trim();
        let downloadLink = $('.wpfd-downloadlink').attr('href') || 
                           $('.wpfd-single-file-button').attr('href');

        if (!downloadLink) {
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/download/')) {
                    downloadLink = href;
                }
            });
        }

        if (downloadLink) {
            return res.json({
                success: true,
                creator: "ZANTA-MD",
                title: title,
                download_url: downloadLink,
                info: "මෙම ලින්ක් එක කෙලින්ම PDF එක බාගත කිරීමට පාවිච්චි කළ හැක."
            });
        }
        res.status(404).json({ success: false, message: "Download link එක සොයාගත නොහැකි විය." });
    } catch (e) {
        res.status(500).json({ success: false, error: "Link extraction failed: " + e.message });
    }
});

// --- 🎬 Moviesublk Search API ---
app.get('/api/moviesublk/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: false, message: "සෙවිය යුතු නම ඇතුළත් කරන්න." });

    try {
        // Blogger search URL එක
        const searchUrl = `https://www.moviesublk.com/search?q=${encodeURIComponent(q)}`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://www.moviesublk.com/'
            }
        });

        const $ = cheerio.load(response.data);
        let results = [];

        // Screenshot එකේ තියෙන 's-card' class එක අනුව data ගන්නවා
        $('.s-card').each((i, el) => {
            const title = $(el).find('.s-title').text().trim();
            const link = $(el).attr('onclick')?.match(/'([^']+)'/)?.[1] || "";
            const img = $(el).find('.s-thumb').attr('src');
            const type = $(el).find('.s-badge').text().trim() || "MOVIE";

            if (title && link) {
                results.push({
                    title: title,
                    url: link,
                    thumbnail: img,
                    type: type
                });
            }
        });

        // නිවැරදි ප්‍රතිඵල ලැබුණේ නැත්නම් alternate selector එකක් බලමු (සාමාන්‍ය Blogger posts සඳහා)
        if (results.length === 0) {
            $('.post-outer, article').each((i, el) => {
                const title = $(el).find('.entry-title a, .post-title a').text().trim();
                const link = $(el).find('.entry-title a, .post-title a').attr('href');
                const img = $(el).find('img').attr('src');

                if (title && link) {
                    results.push({
                        title: title,
                        url: link,
                        thumbnail: img,
                        type: "MOVIE"
                    });
                }
            });
        }

        res.json({
            status: true,
            creator: "ZANTA-MD",
            count: results.length,
            results: results
        });

    } catch (e) {
        res.status(500).json({
            status: false,
            error: "Moviesublk Search failed: " + e.message
        });
    }
});

//------MOVIE SUBLK TV SHOW SEARCH-------
app.get('/api/tvshow/dl', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: "URL එක ලබා දෙන්න." });

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.moviesublk.com/'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        const title = $('title').text().replace(' - MovieSubLK', '').trim();
        const image = $('.post-body.entry-content img').first().attr('src') || "";

        // --- 1. Episode Grid එක පරීක්ෂා කිරීම (TV Show Check) ---
        const epGrid = $('#ep-grid, .nav-grid'); // Screenshot එකේ තියෙන ID එක
        
        if (epGrid.length > 0) {
            let episodes = [];
            epGrid.find('button, a').each((i, el) => {
                const epTitle = $(el).text().trim();
                // සමහර විට Episode ලින්ක් එක තිබෙන්නේ button එකේ onClick එකේ හෝ a tag එකේ href එකේ
                const epLink = $(el).attr('href') || $(el).attr('onclick')?.match(/'([^']+)'/)?.[1] || "";

                if (epTitle) {
                    episodes.push({
                        episode: epTitle,
                        url: epLink.startsWith('http') ? epLink : `https://www.moviesublk.com${epLink}`
                    });
                }
            });

            return res.json({
                status: true,
                type: "TV_SHOW",
                creator: "ZANTA-MD",
                title: title,
                image: image,
                total_episodes: episodes.length,
                episodes: episodes
            });
        }

        // --- 2. සාමාන්‍ය Movie එකක් නම් (පැරණි Logic එක) ---
        const movieDetails = {};
        $('.post-body.entry-content ul li').each((i, el) => {
            const text = $(el).text();
            if (text.includes(':')) {
                const parts = text.split(':');
                movieDetails[parts[0].trim()] = parts[1].trim();
            }
        });

        const gdriveRegex = /https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|file\/d\/)([a-zA-Z0-9_-]+)/;
        const match = html.match(gdriveRegex);

        if (!match || !match[1]) {
            return res.json({ status: true, type: "MOVIE", title: title, message: "Direct download link not found. Manual check required." });
        }

        const fileId = match[1];
        const finalLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

        res.json({
            status: true,
            type: "MOVIE",
            creator: "ZANTA-MD",
            title: title,
            image: image,
            movie_info: movieDetails, 
            direct_download_url: finalLink
        });

    } catch (e) {
        res.status(500).json({ status: false, error: "Extraction failed: " + e.message });
    }
});

app.get('/api/moviesublk/dl', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: "URL එක ලබා දෙන්න." });

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.moviesublk.com/'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // --- 1. මූලික තොරතුරු ---
        const title = $('title').text().replace(' - MovieSubLK', '').trim();
        const image = $('.post-body.entry-content img').first().attr('src') || "";

        const movieDetails = {};

        // 🔍 ක්‍රමය A: <ul> <li> ඇතුළේ විස්තර තිබේ නම් (උදා: Hotel Transylvania)
        $('.post-body.entry-content ul li').each((i, el) => {
            const text = $(el).text();
            if (text.includes(':')) {
                const parts = text.split(':');
                const key = parts[0].trim();
                const value = parts[1].trim();
                if (key && value) movieDetails[key] = value;
            }
        });

        // 🔍 ක්‍රමය B: .sd-info ඇතුළේ විස්තර තිබේ නම් (උදා: Scooby-Doo / Heidi)
        // මේකෙදි අපි කරන්නේ strong ටැග් එකේ තියෙන text එක key එක විදිහට අරන් ඊළඟට තියෙන text එක value එක විදිහට ගන්න එකයි
        if (Object.keys(movieDetails).length === 0) {
            $('.sd-info strong').each((i, el) => {
                const key = $(el).text().replace(':', '').trim();
                const value = el.nextSibling ? $(el.nextSibling).text().trim() : "";
                if (key && value) {
                    movieDetails[key] = value;
                }
            });
        }

        // --- 2. Google Drive ID එක සොයා ගැනීම ---
        const gdriveRegex = /https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|file\/d\/)([a-zA-Z0-9_-]+)/;
        const match = html.match(gdriveRegex);

        if (!match || !match[1]) {
            return res.status(404).json({ status: false, message: "Google Drive ID එක සොයාගත නොහැකි විය." });
        }

        const fileId = match[1];
        const gDriveBase = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        let finalLink = gDriveBase;

        // --- 3. Bypass 'Download anyway' Warning ---
        try {
            const gRes = await axios.get(gDriveBase, { timeout: 10000 });
            const confirmMatch = gRes.data.match(/confirm=([a-zA-Z0-9_]+)/);
            if (confirmMatch) {
                finalLink = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
            }
        } catch (err) {
            finalLink = gDriveBase;
        }

        // --- 4. අවසාන Response එක ---
        res.json({
            status: true,
            creator: "ZANTA-MD",
            title: title,
            image: image,
            movie_info: movieDetails, 
            file_id: fileId,
            gdrive_url: `https://drive.google.com/file/d/${fileId}/view`,
            direct_download_url: finalLink
        });

    } catch (e) {
        res.status(500).json({ status: false, error: "Link extraction failed: " + e.message });
    }
});


// --- 🎮 AN1.COM Direct Download API ---
app.get('/api/an1/download', async (req, res) => {
    const { url } = req.query; 
    if (!url) return res.status(400).json({ success: false, message: "URL එක ලබා දෙන්න." });

    try {
        const HEADERS = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://an1.com/'
        };

        const mainPage = await axios.get(url, { headers: HEADERS });
        const $main = cheerio.load(mainPage.data);

        const title = $main('h1').first().text().trim();
        
        // --- Image URL එක මෙතනින් ගන්නවා ---
        const image = $main('.app_view_first img').attr('src') || $main('img[itemprop="image"]').attr('src');
        const imageUrl = image ? (image.startsWith('http') ? image : `https://an1.com${image}`) : "N/A";
        
        let androidVersion = "N/A";
        $main('ul.spec li').each((i, el) => {
            const text = $main(el).text();
            if (text.includes('Android')) {
                androidVersion = text.replace('Android', '').trim();
            }
        });

        const fileSize = $main('span[itemprop="fileSize"]').text().trim() || "N/A";

        let dwPath = $main('.spec_addon a.btn-green').attr('href') || $main('.download_line').attr('href');
        if (!dwPath) dwPath = url.replace('.html', '-dw.html').replace('https://an1.com', '');

        const downloadPageUrl = dwPath.startsWith('http') ? dwPath : `https://an1.com${dwPath}`;

        const downloadPage = await axios.get(downloadPageUrl, {
            headers: { ...HEADERS, 'Referer': url }
        });

        const $dw = cheerio.load(downloadPage.data);
        let finalLink = $dw('a#pre_download').attr('href');

        if (!finalLink) {
            const regex = /https:\/\/files\.an1\.net\/[^"'\s<>]+/g;
            const matches = downloadPage.data.match(regex);
            if (matches) {
                finalLink = matches.find(l => !l.includes('an1store.apk'));
            }
        }

        if (finalLink) {
            return res.json({
                success: true,
                creator: "ZANTA-MD",
                info: {
                    title: title,
                    android: androidVersion,
                    size: fileSize,
                    thumbnail: imageUrl // අලුතින් එකතු කළ image url එක
                },
                download_url: finalLink
            });
        }

        res.status(404).json({ success: false, message: "Link not found" });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
app.get('/api/an1/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Search query එකක් ලබා දෙන්න." });

    try {
        // an1.com සයිට් එකේ search query එක යන්නේ POST request එකක් විදිහට හෝ 
        // URL query parameters විදිහටයි. මෙන්න සරලම ක්‍රමය:
        const searchUrl = `https://an1.com/?story=${encodeURIComponent(q)}&do=search&subaction=search`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://an1.com/'
            }
        });

        const $ = cheerio.load(response.data);
        let results = [];

        // සයිට් එකේ 'item' class එක සහිත div තුළ තමයි apps ලිස්ට් එක තියෙන්නේ
        $('.app_list .item').each((i, el) => {
            const title = $(el).find('.cont .data .name span').text().trim();
            const link = $(el).find('.cont .data .name a').attr('href');
            const img = $(el).find('.img img').attr('src');
            const developer = $(el).find('.developer').text().trim();
            const rating = $(el).find('.meta .rating_num').text().trim() || "N/A";

            if (link && title) {
                results.push({
                    title: title,
                    url: link,
                    thumbnail: img.startsWith('http') ? img : `https://an1.com${img}`,
                    developer: developer,
                    rating: rating
                });
            }
        });

        res.json({ 
            success: true, 
            creator: "ZANTA-MD", 
            count: results.length, 
            results: results 
        });

    } catch (e) {
        res.status(500).json({ 
            success: false, 
            error: "AN1 Search failed: " + e.message 
        });
    }
});

app.get('/api/anime-search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ success: false, error: 'Query required' });

        const { data } = await axios.get(`${BASE_URL}/search.php?s=${encodeURIComponent(q)}`, { headers: getHeaders() });
        const $ = cheerio.load(data);
        const results = [];

        $('div.info3.bc1 > div.similarimg').each((_, element) => {
            const linkPath = $(element).find('div.p1 > a').attr('href');
            const imgPath = $(element).find('img.coverimg').attr('src');
            
            if (linkPath) {
                results.push({
                    title: $(element).find('div.similarname.c > a').text().trim(),
                    image: imgPath ? `${BASE_URL}/${imgPath}` : null,
                    url: `${BASE_URL}/${linkPath}`,
                    id: linkPath.split('=')[1]
                });
            }
        });

        res.json({ success: true, creator: "ZANTA-MD", count: results.length, data: results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2️⃣ Get Anime Info & Episode List
app.get('/api/anime-info', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ success: false, error: 'URL required' });

        const { data } = await axios.get(url, { headers: getHeaders() });
        const $ = cheerio.load(data);

        const title = $('div.infotitle.c').first().text().trim();
        const image = $('img.posterimg').attr('src');
        const description = $('div.infodes.c').text().trim();

        const episodes = [];
        $('div.linetitle2.c2 a.c').each((_, e) => {
            const epId = $(e).attr('id');
            const epNum = $(e).find('div.watch2.bc').text().trim() || (episodes.length + 1);
            if (epId) {
                episodes.push({
                    episode: epNum,
                    url: `${BASE_URL}/gate.php?id=${epId}`
                });
            }
        });

        res.json({
            success: true,
            creator: "ZANTA-MD",
            result: { title, image: image ? `${BASE_URL}/${image}` : null, description, episodes }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/anime-download', async (req, res) => {
    try {
        const { url } = req.query; // Episode gate.php URL එක
        if (!url) return res.status(400).json({ success: false, error: 'Episode URL required' });

        const { data } = await axios.get(url, { headers: getHeaders() });
        const $ = cheerio.load(data);
        let dlLink = $('a[href*="video.mp4"]').attr('href');
        if (!dlLink) {
            const regex = /https:\/\/c[a-z]{1,2}\.animeheaven\.me\/video\.mp4\?[^"']+/;
            const match = data.match(regex);
            if (match) dlLink = match[0];
        }
        if (!dlLink) {
            dlLink = $('video source').attr('src');
        }

        if (!dlLink) return res.status(404).json({ success: false, message: "Could not bypass. Site may be protected." });

        res.json({ success: true, creator: "ZANTA-MD", download_url: dlLink });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
//-------------------------------------------------------------------
app.get('/api/yt/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ status: false, error: "Search query එකක් දෙන්න." });

    try {
        const search = await yts(q);
        const results = search.videos.slice(0, 10).map(v => ({
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnail,
            timestamp: v.timestamp,
            author: v.author.name
        }));

        res.json({ status: true, results });
    } catch (e) {
        res.json({ status: false, error: "Search failed: " + e.message });
    }
});


// --- YouTube MP3 Download (Proxy Method) ---
app.get('/api/download', async (req, res) => {
    const youtubeUrl = req.query.url;
    if (!youtubeUrl) return res.json({ status: false, error: "URL එකක් ලබා දෙන්න" });

    try {
        // Video ID එක අරගැනීම
        const videoId = youtubeUrl.split('be/')[1]?.split('?')[0] || 
                        youtubeUrl.split('v=')[1]?.split('&')[0];
        if (!videoId) return res.json({ status: false, error: "Invalid YouTube URL" });

        const ajaxUrl = 'https://ssyoutube.online/wp-admin/admin-ajax.php';

        // Step 1: MP3 ලින්ක් එක ලබා ගැනීම
        const step1 = new URLSearchParams({ action: 'get_mp3_yt_option', videoId: videoId });
        const res1 = await axios.post(ajaxUrl, step1);

        if (!res1.data?.success || !res1.data.data.link) {
            return res.json({ status: false, error: "Download link not found" });
        }

        const rawMp3Link = res1.data.data.link;

        // Step 2: Proxy හරහා direct link එක ලබා ගැනීම
        const step2 = new URLSearchParams({ action: 'mp3_yt_generic_proxy_ajax', targetUrl: rawMp3Link });
        const res2 = await axios.post(ajaxUrl, step2);

        if (res2.data?.success && res2.data.data.proxiedUrl) {
            // කෙලින්ම ලින්ක් එක JSON එකක් විදිහට යවන්න (බෝට් එකෙන් මේක හසුරුවා ගන්න)
            return res.json({
                status: true,
                title: res1.data.data.title,
                download_url: res2.data.data.proxiedUrl
            });
        } else {
            return res.json({ status: false, error: "Proxy generation failed" });
        }
    } catch (error) {
        return res.json({ status: false, error: "Server error: " + error.message });
    }
});

// --- 🔍 01. XNXX Search API ---
app.get('/api/xnxx/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: false, message: "සෙවුම් පදය ඇතුළත් කරන්න." });

    try {
        // මෙතැන .com වෙනුවට .tv පාවිච්චි කළා
        const url = `https://www.xnxx.tv/search/${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(data);
        let results = [];

        $('.thumb-block').each((i, el) => {
            const title = $(el).find('.thumb-under a').first().attr('title');
            const link = $(el).find('.thumb-under a').first().attr('href');
            const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

            if (link && title) {
                results.push({
                    title: title,
                    // ලින්ක් එක .tv විදිහටම සකස් කරනවා
                    url: link.startsWith('http') ? link : `https://www.xnxx.tv${link}`,
                    thumbnail: thumb
                });
            }
        });

        res.json({ status: true, results: results.slice(0, 15) });
    } catch (e) {
        res.status(500).json({ status: false, error: "Search failed: " + e.message });
    }
});

// --- 🎬 02. XNXX Video Details ---
app.get('/api/xnxx/detail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: "URL එක ලබා දෙන්න." });

    try {
        // මෙහිදී URL එක .tv එකක් බව සහතික කරගන්න
        const targetUrl = url.replace('xnxx.com', 'xnxx.tv');
        const { data } = await axios.get(targetUrl, { headers: { 'User-Agent': USER_AGENT } });
        
        const lowRes = data.match(/setVideoUrlLow\('(.*?)'\)/);
        const highRes = data.match(/setVideoUrlHigh\('(.*?)'\)/);
        const titleMatch = data.match(/setVideoTitle\('(.*?)'\)/);

        if (lowRes || highRes) {
            res.json({
                status: true,
                title: titleMatch ? titleMatch[1] : "Video Detail",
                dl_links: {
                    low: lowRes ? lowRes[1] : null,
                    high: highRes ? highRes[1] : null
                }
            });
        } else {
            res.status(404).json({ status: false, message: "වීඩියෝ ලින්ක් සොයාගත නොහැක." });
        }
    } catch (e) {
        res.status(500).json({ status: false, error: "Detail failed: " + e.message });
    }
});

// --- 🔍 පියවර 01: මූවීස් සෙවීම (Search) ---
app.get('/api/sinhalasub/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: false, message: "නමක් ලබා දෙන්න." });

    try {
        const response = await axios.get(`https://sinhalasub.lk/?s=${encodeURIComponent(q)}`, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(response.data);
        let results = [];

        $('.display-item, .result-item, article').each((i, el) => {
            const a = $(el).find('.item-box a, h2 a, h3 a, .title a').first();
            const title = a.attr('title') || a.text().trim();
            const link = a.attr('href');
            const img = $(el).find('img').attr('src');

            if (link && title && link.includes('sinhalasub.lk')) {
                results.push({
                    title: title.replace('Sinhala Subtitles | සිංහල උපසිරැසි සමඟ', '').trim(),
                    url: link,
                    image: img
                });
            }
        });
        res.json({ status: true, results });
    } catch (e) {
        res.status(500).json({ status: false, error: "සෙවිය නොහැකි විය: " + e.message });
    }
});

// --- 🎬 පියවර 02: මූවී විස්තර සහ Direct Pixeldrain Links ---
app.get('/api/sinhalasub/movie-details', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: "Movie URL එක ලබා දෙන්න." });

    try {
        const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(response.data);

        const title = $('.data h1').text().trim() || $('.entry-title').text().trim();
        const poster = $('.poster img').attr('src') || $('meta[property="og:image"]').attr('content');
        const rating = $('.details .imdb b').text().trim() || "N/A";

        let tempLinks = [];
        $('table tr').each((i, el) => {
            const linkTag = $(el).find('a[href*="/links/"]');
            if (linkTag.length > 0) {
                tempLinks.push({
                    quality: $(el).find('td').first().text().trim(),
                    size: $(el).find('td:nth-child(2)').text().trim(),
                    redirectUrl: linkTag.attr('href')
                });
            }
        });

        // 🚀 මෙතනදී තමයි හැම ලින්ක් එකක්ම Bypass කරලා Pixeldrain direct ලින්ක් හදන්නේ
        const finalDownloads = await Promise.all(tempLinks.map(async (item) => {
            try {
                const resLink = await axios.get(item.redirectUrl, { 
                    headers: { ...HEADERS, 'Referer': url }, 
                    timeout: 8000 
                });
                
                // HTML එක ඇතුළේ Pixeldrain ID එක තියෙනවද බලමු
                const pixeldrainMatch = resLink.data.match(/https?:\/\/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                
                if (pixeldrainMatch) {
                    const fileId = pixeldrainMatch[1];
                    return {
                        quality: `${item.quality} (${item.size})`,
                        direct_url: `https://pixeldrain.com/api/file/${fileId}?download=1`
                    };
                }
                return null;
            } catch (err) { return null; }
        }));

        res.json({
            status: true,
            title: title.replace('Sinhala Subtitles | සිංහල උපසිරැසි සමඟ', '').trim(),
            rating,
            poster,
            download_links: finalDownloads.filter(l => l !== null)
        });

    } catch (e) {
        res.status(500).json({ status: false, error: "විස්තර ලබාගත නොහැක: " + e.message });
    }
});

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


