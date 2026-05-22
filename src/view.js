function toggleMap(type) {
    const img = document.getElementById('map-img');
    const canvas = document.getElementById('sketch-canvas');
    const matchBtn = document.getElementById('btn-field-match');
    const skillsBtn = document.getElementById('btn-field-skills');

    currentField = type;
    const path = type === 'match' ? 'assets/images/field.png' : 'assets/images/skills.png';

    if(img) img.src = path;
    const drawImg = document.getElementById('draw-map-img');
    if(drawImg) drawImg.src = path;
    if(canvas) canvas.style.backgroundImage = 'none';

    if (type === 'match') {
        if(matchBtn) matchBtn.classList.add('active');
        if(skillsBtn) skillsBtn.classList.remove('active');
    } else {
        if(skillsBtn) skillsBtn.classList.add('active');
        if(matchBtn) matchBtn.classList.remove('active');
    }
}

function setFieldMode(mode) {
    const std = document.getElementById('standard-view');
    const draw = document.getElementById('draw-view');
    const saved = document.getElementById('saved-view');
    const subtitle = document.getElementById('field-subtitle');
    
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    
    // hide all
    if(std) std.style.display = 'none';
    if(draw) draw.style.display = 'none';
    if(saved) saved.style.display = 'none';

    if (mode === 'standard') {
        if(std) std.style.display = 'block';
        document.getElementById('sub-std').classList.add('active');
        if(subtitle) subtitle.innerText = "Strategic Layout";
    } else if (mode === 'draw') {
        if(draw) draw.style.display = 'block';
        document.getElementById('sub-draw').classList.add('active');
        if(subtitle) subtitle.innerText = "Draw Strategy";
        
        //refresh field image
        toggleMap(currentField);

        const c   = document.getElementById('sketch-canvas');
        const ref = document.getElementById('draw-map-img');
        if (c && ref && ref.offsetWidth > 0) {
            const rect = ref.getBoundingClientRect();
            c.width  = rect.width;
            c.height = rect.height;
        }
    } else if (mode === 'saved') {
        if(saved) saved.style.display = 'block';
        document.getElementById('sub-saved').classList.add('active');
        if(subtitle) subtitle.innerText = "Saved Strategies";
        displayDrawing();
    }
}
