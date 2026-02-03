document.getElementById('convertBtn').addEventListener('click', async function() {
    const url = document.getElementById('linkInput').value;
    const btn = this;
    const status = document.getElementById('statusMessage');
    const preview = document.getElementById('downloadPreview');
    const thumbImg = document.getElementById('previewThumb');
    const progText = document.getElementById('progressText');
    const durationText = document.getElementById('previewDuration');


    if (!url) return;

    // 1. Reset UI and SHOW PREVIEW IMMEDIATELY
    btn.innerText = "PROCESSING...";
    btn.disabled = true;
    status.innerText = "";
    
    // We show a placeholder or just the box while waiting for the thumb URL
    preview.style.display = "block";
    progText.innerText = "STATUS: INITIALIZING ";

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });

        if (response.ok) {
            const fileName = response.headers.get('X-File-Name');
            const thumbUrl = response.headers.get('X-Thumbnail');

            // 2. Update Preview with real data
            thumbImg.src = thumbUrl;
            document.getElementById('previewTitle').innerText = fileName.replace('.mp3', '');
            progText.innerText = "STATUS: DOWNLOADING AUDIO...";

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            a.click();
            // 3. Update History
            addToHistory(fileName, thumbUrl);
            status.innerText = "SUCCESS";
            progText.innerText = "STATUS: COMPLETE";
        } else {
            status.innerText = "ERROR: LINK NOT SUPPORTED";
            preview.style.display = "none";
        }
    } catch (err) {
        status.innerText = "SERVER ERROR";
        preview.style.display = "none";
    } finally {
        btn.innerText = "CONVERT";
        btn.disabled = false;
        // Keep the preview visible for a few seconds after success
        setTimeout(() => { 
            preview.style.display = "none";
            thumbImg.src = ""; // Clear for next time
        }, 10000);
    }
});

function addToHistory(name, thumb) {
    const list = document.getElementById('historyList');
    const count = list.children.length + 1;
    const id = count < 10 ? `0${count}` : count;
    
    const item = document.createElement('div');
    item.style = "display: flex; align-items: center; margin-bottom: 25px; font-family: monospace; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;";
    
    item.innerHTML = `
        <div style="width: 40px; font-weight: bold; font-size: 12px;">${id}</div>
        <img src="${thumb}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 25px; border: 1px solid #000;">
        <div style="flex-grow: 1;">
            <div style="font-weight: bold; text-transform: uppercase; font-size: 13px;">${name.replace('.mp3', '')}</div>
            <div style="color: #999; font-size: 10px; margin-top: 4px;">SYSTEM_O / 320KBPS / MP3</div>
        </div>
        <div style="font-size: 11px; font-weight: bold;">DONE</div>
    `;
    list.prepend(item);
}