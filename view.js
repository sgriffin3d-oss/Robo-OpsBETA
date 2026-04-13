function toggleMap(type) {
    const img = document.getElementById('map-img');
    const canvas = document.getElementById('sketch-canvas');
    const matchBtn = document.getElementById('btn-field-match');
    const skillsBtn = document.getElementById('btn-field-skills');

    currentField = type;
    const path = type === 'match' ? 'images/field.png' : 'images/skills.png';

    if(img) img.src = path;
    if(canvas) canvas.style.backgroundImage = `url('${path}')`;

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
    const saveBtn = document.querySelector('#draw-view .save-btn');
    
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    
    if(std) std.style.display = 'none';
    if(draw) draw.style.display = 'none';
    if(saved) saved.style.display = 'none';

    if (mode === 'standard') {
        if(std) std.style.display = 'block';
        document.getElementById('sub-std').classList.add('active');
        if(subtitle) subtitle.innerText = "Strategic Layout";
    } else if (mode === 'draw') {
        // Handle UI labeling for Edit vs New
        if (!editingSketchId) {
            clearCanvas();
            document.getElementById('sketch-name').value = '';
            if(saveBtn) saveBtn.innerText = "SAVE STRATEGY";
        } else {
            if(saveBtn) saveBtn.innerText = "UPDATE STRATEGY";
        }
        
        if(draw) draw.style.display = 'block';
        document.getElementById('sub-draw').classList.add('active');
        if(subtitle) subtitle.innerText = editingSketchId ? "Edit Strategy" : "Draw Strategy";
        toggleMap(currentField); 
    } else if (mode === 'saved') {
        editingSketchId = null; // Clear edit state when exiting
        if(saved) saved.style.display = 'block';
        document.getElementById('sub-saved').classList.add('active');
        if(subtitle) subtitle.innerText = "Saved Strategies";
        drawSketches();
    }
}

function toggleZoom(frameId) {
    const frame = document.getElementById(frameId);
    if(frame) frame.classList.toggle('zoomed');
}
