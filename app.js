document.addEventListener('DOMContentLoaded', () => {
    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
    }

    // --- State Management ---
    let state = {
        boards: [],
        currentBoardId: null,
    };

    const saveState = () => {
        localStorage.setItem('kanvoState', JSON.stringify(state));
    };

    const loadState = () => {
        const savedState = localStorage.getItem('kanvoState');
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            // Default state for first-time users
            state = {
                boards: [
                    {
                        id: `board-${Date.now()}`,
                        name: 'Mi Primer Tablero',
                        columns: [
                            { id: `col-${Date.now()}-1`, name: 'Por Hacer', cards: [{ id: `card-${Date.now()}`, title: '¡Bienvenido a Kanvo!', description: 'Arrastra esta tarjeta a otra columna.' }] },
                            { id: `col-${Date.now()}-2`, name: 'En Progreso', cards: [] },
                            { id: `col-${Date.now()}-3`, name: 'Hecho', cards: [] },
                        ]
                    }
                ],
                currentBoardId: null,
            };
            saveState();
        }
    };

    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const headerTitle = document.getElementById('header-title');
    const backButton = document.getElementById('back-to-dashboard');
    const fab = document.getElementById('fab-add');

    // --- Modals ---
    const newBoardModal = document.getElementById('new-board-modal');
    const cardDetailModal = document.getElementById('card-detail-modal');
    const closeBoardModalBtn = document.getElementById('close-board-modal');
    const closeCardModalBtn = document.getElementById('close-card-modal');
    const createBoardBtn = document.getElementById('create-board-btn');
    const newBoardNameInput = document.getElementById('new-board-name');
    const saveCardBtn = document.getElementById('save-card-btn');
    const deleteCardBtn = document.getElementById('delete-card-btn');

    let currentEditingCard = { boardId: null, columnId: null, cardId: null };

    // --- Rendering Functions ---
    const renderDashboard = () => {
        appContainer.innerHTML = '<div id="dashboard-view"></div>';
        const dashboardView = document.getElementById('dashboard-view');
        if (state.boards.length === 0) {
            dashboardView.innerHTML = '<p>No tienes tableros. ¡Crea uno para empezar!</p>';
        } else {
            state.boards.forEach(board => {
                const boardCard = document.createElement('div');
                boardCard.className = 'board-card';
                boardCard.textContent = board.name;
                boardCard.dataset.boardId = board.id;
                boardCard.addEventListener('click', () => {
                    state.currentBoardId = board.id;
                    render();
                });
                dashboardView.appendChild(boardCard);
            });
        }
        headerTitle.textContent = 'Kanvo';
        backButton.classList.add('hidden');
        fab.textContent = '+';
        fab.onclick = openNewBoardModal;
    };

    const renderBoard = () => {
        const board = state.boards.find(b => b.id === state.currentBoardId);
        if (!board) {
            state.currentBoardId = null;
            render();
            return;
        }

        appContainer.innerHTML = '<div id="board-view"></div>';
        const boardView = document.getElementById('board-view');
        board.columns.forEach(column => {
            const columnEl = document.createElement('div');
            columnEl.className = 'column';
            columnEl.dataset.columnId = column.id;
            columnEl.innerHTML = `
                <div class="column-header">${column.name}</div>
                <div class="cards-container"></div>
            `;

            const cardsContainer = columnEl.querySelector('.cards-container');
            column.cards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'task-card';
                cardEl.textContent = card.title;
                cardEl.dataset.cardId = card.id;
                cardEl.draggable = true;

                cardEl.addEventListener('click', () => openCardDetailModal(board.id, column.id, card.id));
                cardEl.addEventListener('dragstart', handleDragStart);
                cardsContainer.appendChild(cardEl);
            });

            // Drag and Drop listeners for columns
            columnEl.addEventListener('dragover', handleDragOver);
            columnEl.addEventListener('drop', handleDrop);

            boardView.appendChild(columnEl);
        });

        headerTitle.textContent = board.name;
        backButton.classList.remove('hidden');
        fab.textContent = '+';
        fab.onclick = () => quickAddTask(board.id);
    };

    const render = () => {
        if (state.currentBoardId) {
            renderBoard();
        } else {
            renderDashboard();
        }
    };

    // --- Event Handlers & Logic ---
    backButton.addEventListener('click', () => {
        state.currentBoardId = null;
        saveState();
        render();
    });

    // Modal Logic
    const openNewBoardModal = () => { newBoardModal.classList.add('visible'); newBoardNameInput.focus(); };
    const closeNewBoardModal = () => { newBoardModal.classList.remove('visible'); };
    closeBoardModalBtn.addEventListener('click', closeNewBoardModal);
    createBoardBtn.addEventListener('click', () => {
        const boardName = newBoardNameInput.value.trim();
        if (boardName) {
            const newBoard = {
                id: `board-${Date.now()}`,
                name: boardName,
                columns: [
                    { id: `col-${Date.now()}-1`, name: 'Por Hacer', cards: [] },
                    { id: `col-${Date.now()}-2`, name: 'En Progreso', cards: [] },
                    { id: `col-${Date.now()}-3`, name: 'Hecho', cards: [] },
                ]
            };
            state.boards.push(newBoard);
            saveState();
            newBoardNameInput.value = '';
            closeNewBoardModal();
            renderDashboard();
        }
    });

    const quickAddTask = (boardId) => {
        const taskTitle = prompt('Nombre de la nueva tarea:');
        if (taskTitle && taskTitle.trim() !== '') {
            const board = state.boards.find(b => b.id === boardId);
            if (board && board.columns.length > 0) {
                const newCard = { 
                    id: `card-${Date.now()}`, 
                    title: taskTitle.trim(),
                    description: ''
                };
                board.columns[0].cards.push(newCard);
                saveState();
                renderBoard();
            }
        }
    };

    const openCardDetailModal = (boardId, columnId, cardId) => {
        const board = state.boards.find(b => b.id === boardId);
        const column = board.columns.find(c => c.id === columnId);
        const card = column.cards.find(c => c.id === cardId);

        currentEditingCard = { boardId, columnId, cardId };

        document.getElementById('card-modal-title').textContent = card.title;
        document.getElementById('card-modal-column').textContent = column.name;
        document.getElementById('card-modal-desc').value = card.description || '';
        
        cardDetailModal.classList.add('visible');
    };

    const closeCardDetailModal = () => cardDetailModal.classList.remove('visible');
    closeCardModalBtn.addEventListener('click', closeCardDetailModal);

    saveCardBtn.addEventListener('click', () => {
        const { boardId, columnId, cardId } = currentEditingCard;
        const board = state.boards.find(b => b.id === boardId);
        const column = board.columns.find(c => c.id === columnId);
        const card = column.cards.find(c => c.id === cardId);

        card.description = document.getElementById('card-modal-desc').value;
        saveState();
        closeCardDetailModal();
        // No need to re-render, as description is not visible on the card itself
    });

    deleteCardBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            const { boardId, columnId, cardId } = currentEditingCard;
            const board = state.boards.find(b => b.id === boardId);
            const column = board.columns.find(c => c.id === columnId);
            column.cards = column.cards.filter(c => c.id !== cardId);
            saveState();
            closeCardDetailModal();
            renderBoard();
        }
    });

    // Drag and Drop Logic
    let draggedCardInfo = null;

    function handleDragStart(e) {
        const cardEl = e.target;
        const cardId = cardEl.dataset.cardId;
        const columnEl = cardEl.closest('.column');
        const columnId = columnEl.dataset.columnId;
        
        draggedCardInfo = { cardId, sourceColumnId: columnId };
        e.dataTransfer.setData('text/plain', cardId);
        setTimeout(() => cardEl.classList.add('dragging'), 0);
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetColumnEl = e.target.closest('.column');
        if (!targetColumnEl || !draggedCardInfo) return;

        const targetColumnId = targetColumnEl.dataset.columnId;
        const { cardId, sourceColumnId } = draggedCardInfo;

        // Clean up dragging class
        const draggingEl = document.querySelector('.dragging');
        if(draggingEl) draggingEl.classList.remove('dragging');

        if (sourceColumnId === targetColumnId) return; // No change

        // Find board, columns, and card in state
        const board = state.boards.find(b => b.id === state.currentBoardId);
        const sourceColumn = board.columns.find(c => c.id === sourceColumnId);
        const targetColumn = board.columns.find(c => c.id === targetColumnId);
        const cardIndex = sourceColumn.cards.findIndex(c => c.id === cardId);
        const [cardToMove] = sourceColumn.cards.splice(cardIndex, 1);

        // Add to new column
        targetColumn.cards.push(cardToMove);

        saveState();
        renderBoard();
        draggedCardInfo = null;
    }

    // --- Initial Load ---
    loadState();
    render();
});