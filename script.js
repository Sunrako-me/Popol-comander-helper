let draggedHeroName = null;
let actionHistory = [];

// This will track how many times we shifted rounds, 
// allowing ONLY the badges to move while keeping data locked in place!
let roundOffset = 0; 

// Track the currently active tapped selection element for mobile/click fallback
let tappedSelectedCommander = null;

document.querySelectorAll('.commander-item').forEach(item => {
    // --- Existing Drag Mechanics ---
    item.addEventListener('dragstart', () => {
        draggedHeroName = item.getAttribute('data-commander');
        item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
    });

    // --- New Tap-to-Select Feature for Phone Compatibility ---
    item.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents clicking the item from instantly deselecting it

        // If the same commander is clicked again, deselect it
        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            tappedSelectedCommander = null;
            draggedHeroName = null;
            return;
        }

        // Clear previous selections
        document.querySelectorAll('.commander-item').forEach(c => c.classList.remove('selected'));

        // Mark this commander as selected
        tappedSelectedCommander = item;
        draggedHeroName = item.getAttribute('data-commander');
        item.classList.add('selected');
    });
});

function checkDuplicateInputs() {
    const counts = {};
    const slots = document.querySelectorAll('.slot');

    slots.forEach(slot => {
        if (slot.classList.contains('occupied')) {
            const commander = slot.querySelector('.slot-target').innerText.trim();
            if (commander) {
                counts[commander] = (counts[commander] || 0) + 1;
            }
        }
    });

    slots.forEach(slot => {
        const inputContainer = slot.querySelector('.user-input-container');
        if (slot.classList.contains('occupied')) {
            const commander = slot.querySelector('.slot-target').innerText.trim();
            if (counts[commander] > 1) {
                inputContainer.classList.add('show-input');
            } else {
                inputContainer.classList.remove('show-input');
            }
        } else {
            inputContainer.classList.remove('show-input');
        }
    });
}

function refreshBadges() {
    // 1. Wipe all active badge texts and classes across the board interface
    document.querySelectorAll('.slot').forEach(slot => {
        const badge = slot.querySelector('.status-badge');
        badge.innerText = "";
        badge.className = "status-badge";
    });

    const totalActions = actionHistory.length;

    if (totalActions > 0) {
        // Find what raw slot was dropped into last
        const lastDroppedSlot = parseInt(actionHistory[totalActions - 1].slot);
        
        // Calculate CURRENT opponent slot based on how many rounds we shifted
        let currentSlotNum = lastDroppedSlot + roundOffset;
        while (currentSlotNum > 7) currentSlotNum -= 7;

        const currentSlot = document.querySelector(`.slot[data-slot="${currentSlotNum}"]`);
        if (currentSlot && currentSlot.classList.contains('occupied')) {
            const badge = currentSlot.querySelector('.status-badge');
            badge.innerText = "Current Opponent";
            badge.className = "status-badge current";
        }

        // Calculate PREVIOUS opponent slot (1 step behind current)
        let prevSlotNum = currentSlotNum - 1;
        if (prevSlotNum < 1) prevSlotNum = 7;

        const prevSlot = document.querySelector(`.slot[data-slot="${prevSlotNum}"]`);
        if (prevSlot && prevSlot.classList.contains('occupied')) {
            const badge = prevSlot.querySelector('.status-badge');
            badge.innerText = "Previous Opponent";
            badge.className = "status-badge previous";
        }

        // Calculate NEXT opponent slot (1 step ahead of current)
        let nextSlotNum = currentSlotNum + 1;
        if (nextSlotNum > 7) nextSlotNum = 1;

        const nextSlot = document.querySelector(`.slot[data-slot="${nextSlotNum}"]`);
        if (nextSlot && nextSlot.classList.contains('occupied')) {
            const badge = nextSlot.querySelector('.status-badge');
            badge.innerText = "Next Opponent";
            badge.className = "status-badge next";
        }
    }

    // Lock/Unlock the button based on slots completeness
    const occupiedCount = document.querySelectorAll('.slot.occupied').length;
    const nextBtn = document.getElementById('nextBtn');
    if (occupiedCount === 7) {
        nextBtn.removeAttribute('disabled');
    } else {
        nextBtn.setAttribute('disabled', 'true');
    }

    checkDuplicateInputs();
}

document.querySelectorAll('.slot').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
    });

    // Helper function to centralize the assignment logic for both drop and click actions
    function executeAssignment() {
        if (draggedHeroName) {
            const slotNum = parseInt(slot.getAttribute('data-slot'));

            // Strict continuous sequential order checking rules
            if (slotNum > 1) {
                const prevSlot = document.querySelector(`.slot[data-slot="${slotNum - 1}"]`);
                if (!prevSlot || !prevSlot.classList.contains('occupied')) {
                    alert(`Please fill out Spot ${slotNum - 1} before moving to Spot ${slotNum}.`);
                    return false; // Stop execution
                }
            }

            const target = slot.querySelector('.slot-target');
            const oldContent = target.innerText;
            const inputField = slot.querySelector('.user-input-container input');
            const oldInputValue = inputField.value;

            target.innerText = draggedHeroName;
            slot.classList.add('occupied');

            actionHistory = actionHistory.filter(act => act.slot !== slotNum.toString());
            actionHistory.push({
                slot: slotNum.toString(),
                previousValue: oldContent,
                previousInputValue: oldInputValue
            });

            refreshBadges();
            return true; // Success
        }
        return false;
    }

    // --- Drag Drop Handler ---
    slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        executeAssignment();
    });

    // --- New Click Slot Handler (Executes the selection if a commander is highlighted) ---
    slot.addEventListener('click', () => {
        if (tappedSelectedCommander) {
            const success = executeAssignment();
            
            if (success) {
                // Clear the active selection states once successfully placed
                tappedSelectedCommander.classList.remove('selected');
                tappedSelectedCommander = null;
                draggedHeroName = null;
            }
        }
    });
});

// Deselect the commander if the user clicks anywhere else on the blank layout page
document.addEventListener('click', (e) => {
    if (!e.target.closest('.commander-item') && !e.target.closest('.slot')) {
        if (tappedSelectedCommander) {
            tappedSelectedCommander.classList.remove('selected');
            tappedSelectedCommander = null;
            draggedHeroName = null;
        }
    }
});

document.getElementById('reverseBtn').addEventListener('click', () => {
    if (actionHistory.length > 0) {
        const lastAction = actionHistory.pop();
        const targetSlot = document.querySelector(`.slot[data-slot="${lastAction.slot}"]`);
        const targetInner = targetSlot.querySelector('.slot-target');
        const inputField = targetSlot.querySelector('.user-input-container input');
        
        targetInner.innerText = lastAction.previousValue;
        
        if (lastAction.previousValue === "") {
            targetSlot.classList.remove('occupied');
            inputField.value = "";
        } else {
            inputField.value = lastAction.previousInputValue || "";
        }
        
        refreshBadges();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    // We only change the badge offsets so the labels move down the layout grid!
    roundOffset++;
    if (roundOffset > 7) roundOffset = 1;

    refreshBadges();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    document.querySelectorAll('.slot-target').forEach(target => {
        target.innerText = "";
    });
    document.querySelectorAll('.user-input-container input').forEach(input => {
        input.value = "";
    });
    document.querySelectorAll('.slot').forEach(slot => {
        slot.classList.remove('occupied');
        const badge = slot.querySelector('.status-badge');
        badge.innerText = "";
        badge.className = "status-badge";
    });
    actionHistory = [];
    roundOffset = 0; // Clear badge shift changes back to zero
    refreshBadges();
});