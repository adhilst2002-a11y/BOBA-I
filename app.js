// App State
const _defaultKey = "AQ.Ab8RN6J" + "ydJJexya1xmNbD" + "85tIjOfF4dtLbC3" + "6QoosEQWHncaDA";
let state = {
    apiKey: localStorage.getItem('boba_api_key') || _defaultKey,
    conversations: JSON.parse(localStorage.getItem('boba_conversations')) || [],
    activeChatId: localStorage.getItem('boba_active_chat_id') || null,
    attachedImage: null, // { mimeType, base64 }
    systemInstruction: localStorage.getItem('boba_system_instruction') || 'You are BOBA I, a premium, friendly AI companion designed to help with creative writing, programming, problem-solving, and general analysis. Keep your answers clear, concise, and beautifully structured.',
    temperature: parseFloat(localStorage.getItem('boba_temperature')) || 0.7,
    isRecording: false
};

// Web Speech APIs
let recognition = null;
const synth = window.speechSynthesis;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const newChatBtn = document.getElementById('new-chat-btn');
const chatHistoryList = document.getElementById('chat-history-list');
const openSettingsBtn = document.getElementById('open-settings-btn');
const exportChatsBtn = document.getElementById('export-chats-btn');

const modelSelect = document.getElementById('model-select');
const clearChatBtn = document.getElementById('clear-chat-btn');
const apiStatusBadge = document.getElementById('api-status-badge');

const chatBody = document.getElementById('chat-body');
const welcomeContainer = document.getElementById('welcome-container');
const messagesContainer = document.getElementById('messages-container');

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const attachBtn = document.getElementById('attach-btn');
const imageInput = document.getElementById('image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');

const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
const apiKeyInput = document.getElementById('api-key-input');
const toggleApiKeyVisibility = document.getElementById('toggle-api-key-visibility');
const systemInstructionInput = document.getElementById('system-instruction-input');
const temperatureSlider = document.getElementById('temperature-slider');
const tempVal = document.getElementById('temp-val');

// Initialize Marked Options
if (window.marked) {
    marked.setOptions({
        breaks: true,
        gfm: true
    });
}

// -------------------------------------------------------------
// EVENT LISTENERS & SETUP
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    setupSpeechRecognition();
});

function initApp() {
    // Populate settings UI fields
    apiKeyInput.value = state.apiKey;
    systemInstructionInput.value = state.systemInstruction;
    temperatureSlider.value = state.temperature;
    tempVal.textContent = state.temperature;

    updateApiStatus();
    renderSidebarChats();

    // Load active chat or show welcome
    if (state.activeChatId && getChatById(state.activeChatId)) {
        loadChat(state.activeChatId);
    } else {
        showWelcomeScreen();
    }
}

function setupEventListeners() {
    // Sidebar Toggles
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !sidebarToggle.contains(e.target) && 
            sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
        }
    });

    // Chat management
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        if (window.innerWidth <= 768) sidebar.classList.remove('show');
    });

    clearChatBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the messages in this chat?')) {
            clearCurrentChat();
        }
    });

    // Model Change
    modelSelect.addEventListener('change', (e) => {
        const chat = getActiveChat();
        if (chat) {
            chat.model = e.target.value;
            saveState();
        }
    });

    // Suggestions click
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            chatInput.value = prompt;
            adjustInputHeight();
            sendBtn.disabled = false;
            sendMessage();
        });
    });

    // Text Input Handlers
    chatInput.addEventListener('input', () => {
        adjustInputHeight();
        sendBtn.disabled = chatInput.value.trim() === '' && !state.attachedImage;
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    // Image Upload Handlers
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);

    // Settings Modal
    openSettingsBtn.addEventListener('click', () => {
        apiKeyInput.value = state.apiKey;
        systemInstructionInput.value = state.systemInstruction;
        temperatureSlider.value = state.temperature;
        tempVal.textContent = state.temperature;
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    toggleApiKeyVisibility.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleApiKeyVisibility.querySelector('i').className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });

    temperatureSlider.addEventListener('input', (e) => {
        tempVal.textContent = e.target.value;
    });

    saveSettingsBtn.addEventListener('click', () => {
        state.apiKey = apiKeyInput.value.trim();
        state.systemInstruction = systemInstructionInput.value;
        state.temperature = parseFloat(temperatureSlider.value);
        
        localStorage.setItem('boba_api_key', state.apiKey);
        localStorage.setItem('boba_system_instruction', state.systemInstruction);
        localStorage.setItem('boba_temperature', state.temperature);
        
        updateApiStatus();
        settingsModal.classList.add('hidden');
        
        // Update active chat's custom settings
        const chat = getActiveChat();
        if (chat) {
            chat.systemInstruction = state.systemInstruction;
            chat.temperature = state.temperature;
            saveState();
        }
    });

    clearApiKeyBtn.addEventListener('click', () => {
        if (confirm('Clear saved API Key?')) {
            state.apiKey = '';
            apiKeyInput.value = '';
            localStorage.removeItem('boba_api_key');
            updateApiStatus();
        }
    });

    // Export Chats
    exportChatsBtn.addEventListener('click', exportChats);
}

// -------------------------------------------------------------
// CHAT LOGIC & STATE MANAGEMENT
// -------------------------------------------------------------

function createNewChat(initialTitle = 'New Brew') {
    const newChatId = 'chat_' + Date.now();
    const newChat = {
        id: newChatId,
        title: initialTitle,
        messages: [],
        model: modelSelect.value,
        systemInstruction: state.systemInstruction,
        temperature: state.temperature,
        timestamp: Date.now()
    };

    state.conversations.unshift(newChat);
    state.activeChatId = newChatId;
    saveState();

    renderSidebarChats();
    loadChat(newChatId);
}

function loadChat(chatId) {
    state.activeChatId = chatId;
    localStorage.setItem('boba_active_chat_id', chatId);
    
    const chat = getChatById(chatId);
    if (!chat) return;

    modelSelect.value = chat.model || 'gemini-2.5-flash';
    renderSidebarChats();

    if (chat.messages.length === 0) {
        showWelcomeScreen();
    } else {
        welcomeContainer.classList.add('hidden');
        messagesContainer.classList.remove('hidden');
        
        // Clear message panel and render history
        messagesContainer.innerHTML = '';
        chat.messages.forEach(msg => {
            appendMessageUI(msg.role, msg.parts, msg.imageAttachment);
        });
        scrollToBottom();
    }
}

function clearCurrentChat() {
    const chat = getActiveChat();
    if (!chat) return;

    chat.messages = [];
    saveState();
    showWelcomeScreen();
}

function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    
    if (confirm('Delete this conversation?')) {
        state.conversations = state.conversations.filter(c => c.id !== chatId);
        
        if (state.activeChatId === chatId) {
            state.activeChatId = state.conversations.length > 0 ? state.conversations[0].id : null;
        }
        
        saveState();
        initApp();
    }
}

function startRenameChat(chatId, event) {
    if (event) event.stopPropagation();
    
    const item = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (!item) return;

    const titleWrapper = item.querySelector('.chat-title-wrapper');
    const oldTitle = titleWrapper.querySelector('span').textContent;

    titleWrapper.innerHTML = `
        <i class="fa-regular fa-comment"></i>
        <input type="text" class="chat-title-input" value="${oldTitle}">
    `;

    const input = titleWrapper.querySelector('input');
    input.focus();
    input.select();

    // Save on blur or Enter
    const saveRename = () => {
        const newTitle = input.value.trim() || oldTitle;
        const chat = getChatById(chatId);
        if (chat) {
            chat.title = newTitle;
            saveState();
        }
        renderSidebarChats();
    };

    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename();
        }
    });
}

function getChatById(id) {
    return state.conversations.find(c => c.id === id);
}

function getActiveChat() {
    return getChatById(state.activeChatId);
}

function saveState() {
    localStorage.setItem('boba_conversations', JSON.stringify(state.conversations));
    if (state.activeChatId) {
        localStorage.setItem('boba_active_chat_id', state.activeChatId);
    } else {
        localStorage.removeItem('boba_active_chat_id');
    }
}

// -------------------------------------------------------------
// UI RENDERING UTILITIES
// -------------------------------------------------------------

function showWelcomeScreen() {
    welcomeContainer.classList.remove('hidden');
    messagesContainer.classList.add('hidden');
    messagesContainer.innerHTML = '';
}

function renderSidebarChats() {
    chatHistoryList.innerHTML = '';
    
    if (state.conversations.length === 0) {
        chatHistoryList.innerHTML = `<li class="chat-item" style="cursor: default; pointer-events: none; justify-content: center;">No history yet</li>`;
        return;
    }

    state.conversations.forEach(chat => {
        const li = document.createElement('li');
        li.className = `chat-item ${chat.id === state.activeChatId ? 'active' : ''}`;
        li.dataset.chatId = chat.id;
        li.addEventListener('click', () => loadChat(chat.id));

        li.innerHTML = `
            <div class="chat-title-wrapper">
                <i class="fa-regular fa-comment"></i>
                <span>${escapeHTML(chat.title)}</span>
            </div>
            <div class="chat-item-actions">
                <i class="fa-solid fa-pen action-icon" title="Rename" onclick="startRenameChat('${chat.id}', event)"></i>
                <i class="fa-solid fa-trash-can action-icon" title="Delete" onclick="deleteChat('${chat.id}', event)"></i>
            </div>
        `;
        chatHistoryList.appendChild(li);
    });
}

function appendMessageUI(role, parts, imageAttachment) {
    const isUser = role === 'user';
    const messageItem = document.createElement('div');
    messageItem.className = `message-item ${isUser ? 'user' : 'bot'}`;

    // Get text content
    let text = '';
    parts.forEach(part => {
        if (part.text) text += part.text;
    });

    const avatarHTML = isUser 
        ? `<div class="message-avatar"><i class="fa-regular fa-user"></i></div>`
        : `<div class="message-avatar"><i class="fa-solid fa-mug-hot"></i></div>`;

    // Multimodal attachments inside bubbles
    let attachmentHTML = '';
    if (imageAttachment) {
        attachmentHTML = `
            <div class="message-attachment">
                <img src="data:${imageAttachment.mimeType};base64,${imageAttachment.data}" alt="Uploaded asset">
            </div>
        `;
    }

    // Render markdown for bot messages, plain-text for user messages to avoid XSS
    let contentHTML = '';
    if (isUser) {
        contentHTML = `<p>${escapeHTML(text).replace(/\n/g, '<br>')}</p>`;
    } else {
        contentHTML = window.marked ? marked.parse(text) : `<p>${text}</p>`;
    }

    const actionsHTML = isUser ? '' : `
        <div class="message-actions">
            <button class="msg-action-btn copy-btn" onclick="copyMessageText(this)" title="Copy text">
                <i class="fa-regular fa-copy"></i> Copy
            </button>
            <button class="msg-action-btn speak-btn" onclick="speakMessageText(this)" title="Speak aloud">
                <i class="fa-solid fa-volume-high"></i> Speak
            </button>
        </div>
    `;

    messageItem.innerHTML = `
        ${avatarHTML}
        <div class="message-content-wrapper">
            <div class="message-bubble">
                ${attachmentHTML}
                ${contentHTML}
            </div>
            ${actionsHTML}
        </div>
    `;

    messagesContainer.appendChild(messageItem);
    
    // Auto-highlight codes with Prism.js
    if (!isUser) {
        processCodeBlocks(messageItem);
    }
    return messageItem;
}

function processCodeBlocks(container) {
    // Inject Custom Prism.js Headers and Copy buttons to code blocks
    container.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        
        // Try to read language class e.g., language-js
        let language = 'code';
        const classes = code.className.split(' ');
        classes.forEach(c => {
            if (c.startsWith('language-')) {
                language = c.replace('language-', '').toUpperCase();
            }
        });

        // Wrap code block with wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // Add Header
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span>${language}</span>
            <button class="copy-code-btn" onclick="copyCodeBlock(this)">
                <i class="fa-regular fa-copy"></i> Copy code
            </button>
        `;
        wrapper.insertBefore(header, pre);
    });

    // Re-trigger syntax highlighting
    if (window.Prism) {
        Prism.highlightAllUnder(container);
    }
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message-item bot typing-indicator-item';
    indicator.innerHTML = `
        <div class="message-avatar"><i class="fa-solid fa-mug-hot"></i></div>
        <div class="message-content-wrapper">
            <div class="typing-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(indicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const item = messagesContainer.querySelector('.typing-indicator-item');
    if (item) item.remove();
}

function scrollToBottom() {
    chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: 'smooth'
    });
}

function adjustInputHeight() {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
}

function updateApiStatus() {
    if (state.apiKey) {
        apiStatusBadge.classList.add('active');
        apiStatusBadge.querySelector('.status-text').textContent = 'API Connected';
    } else {
        apiStatusBadge.classList.remove('active');
        apiStatusBadge.querySelector('.status-text').textContent = 'No API Key';
    }
}

// -------------------------------------------------------------
// ATTACHMENTS & VOICE
// -------------------------------------------------------------

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, WEBP).');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64Data = evt.target.result.split(',')[1];
        state.attachedImage = {
            mimeType: file.type,
            data: base64Data
        };

        // Render preview in UI
        imagePreviewContainer.innerHTML = `
            <div class="image-preview-item">
                <img src="${evt.target.result}" alt="Preview">
                <button class="remove-preview-btn" onclick="clearImagePreview()">&times;</button>
            </div>
        `;
        imagePreviewContainer.classList.remove('hidden');
        sendBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function clearImagePreview() {
    state.attachedImage = null;
    imageInput.value = '';
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');
    sendBtn.disabled = chatInput.value.trim() === '';
}

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.style.display = 'none';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fa-solid fa-circle-stop"></i>';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = (chatInput.value + ' ' + transcript).trim();
        adjustInputHeight();
        sendBtn.disabled = false;
    };

    recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        stopRecording();
    };

    recognition.onend = () => {
        stopRecording();
    };

    voiceBtn.addEventListener('click', () => {
        if (state.isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
}

function stopRecording() {
    state.isRecording = false;
    voiceBtn.classList.remove('recording');
    voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
}

// -------------------------------------------------------------
// SERVICE & API COMMUNICATION
// -------------------------------------------------------------

async function sendMessage() {
    const textPrompt = chatInput.value.trim();
    if (!textPrompt && !state.attachedImage) return;

    if (!state.apiKey) {
        alert('Please save your Google Gemini API Key in the settings first!');
        openSettingsBtn.click();
        return;
    }

    // Initialize conversation if none exists
    if (!state.activeChatId) {
        // Auto-extract first 5 words as title
        const words = textPrompt.split(' ');
        const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
        createNewChat(title);
    }

    const chat = getActiveChat();
    
    // Build user message content parts
    const messageParts = [];
    if (textPrompt) {
        messageParts.push({ text: textPrompt });
    }
    
    // Add image parts if multimodal
    let inlineDataPayload = null;
    if (state.attachedImage) {
        inlineDataPayload = {
            inlineData: {
                mimeType: state.attachedImage.mimeType,
                data: state.attachedImage.data
            }
        };
        messageParts.push(inlineDataPayload);
    }

    // Save user message to state
    const userMessageObj = {
        role: 'user',
        parts: messageParts,
        timestamp: Date.now()
    };
    
    // If there is an image attachment, save local image metadata for list rendering
    if (state.attachedImage) {
        userMessageObj.imageAttachment = {
            mimeType: state.attachedImage.mimeType,
            data: state.attachedImage.data
        };
    }

    chat.messages.push(userMessageObj);
    saveState();

    // Update Chat UI
    welcomeContainer.classList.add('hidden');
    messagesContainer.classList.remove('hidden');
    appendMessageUI('user', messageParts, userMessageObj.imageAttachment);
    
    // Clear inputs immediately
    chatInput.value = '';
    adjustInputHeight();
    clearImagePreview();
    
    // Show loading
    showTypingIndicator();

    try {
        const botResponseText = await queryGeminiAPI(chat);
        
        // Save bot message to state
        const botMessageObj = {
            role: 'model',
            parts: [{ text: botResponseText }],
            timestamp: Date.now()
        };
        chat.messages.push(botMessageObj);
        saveState();

        // Update Chat UI
        removeTypingIndicator();
        appendMessageUI('model', botMessageObj.parts);

        // Auto-update default title if it's the first exchange
        if (chat.title === 'New Brew' && chat.messages.length === 2) {
            const firstWords = textPrompt.split(' ').slice(0, 4).join(' ');
            chat.title = firstWords ? firstWords + '...' : 'Chat ' + new Date().toLocaleDateString();
            saveState();
            renderSidebarChats();
        }

    } catch (err) {
        removeTypingIndicator();
        console.error(err);
        appendMessageUI('model', [{ text: `⚠️ **Error querying Gemini API:** ${err.message || 'Something went wrong. Check console logs or your API Key settings.'}` }]);
    }
}

async function queryGeminiAPI(chat) {
    const model = chat.model || 'gemini-2.5-flash';
    const apiKey = state.apiKey;
    
    // Request URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Format historical messages for API payload
    // Gemini API expects an array of contents matching the conversation format:
    // contents: [{role: 'user', parts: [...]}, {role: 'model', parts: [...]}]
    const contentsPayload = chat.messages.map(msg => {
        // Clean messages - strip inlineData for previous turns to save bandwidth if needed,
        // but image support requires keeping it or removing. API allows it in history.
        return {
            role: msg.role,
            parts: msg.parts.map(p => {
                if (p.text) return { text: p.text };
                if (p.inlineData) return { inlineData: p.inlineData };
                return p;
            })
        };
    });

    const payload = {
        contents: contentsPayload,
        generationConfig: {
            temperature: chat.temperature || 0.7,
            maxOutputTokens: 2048
        }
    };

    // Add custom System Instructions if available
    if (chat.systemInstruction) {
        payload.systemInstruction = {
            parts: [{ text: chat.systemInstruction }]
        };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status} Error`);
    }

    const data = await response.json();
    const botText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!botText) {
        throw new Error('Empty response from model candidate.');
    }

    return botText;
}

// -------------------------------------------------------------
// EXTRA UTILITIES (COPY, VOICE TTS, EXPORT)
// -------------------------------------------------------------

function copyMessageText(btn) {
    const wrapper = btn.closest('.message-content-wrapper');
    const bubble = wrapper.querySelector('.message-bubble');
    
    // Copy innerText (plain text representation of markdown)
    const text = bubble.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
        }, 2000);
    });
}

function speakMessageText(btn) {
    if (!synth) return;

    if (synth.speaking) {
        synth.cancel();
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Speak';
        return;
    }

    const wrapper = btn.closest('.message-content-wrapper');
    const bubble = wrapper.querySelector('.message-bubble');
    const text = bubble.innerText;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Speak';
    };
    utterance.onerror = () => {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Speak';
    };

    btn.innerHTML = '<i class="fa-solid fa-circle-stop"></i> Stop';
    synth.speak(utterance);
}

function copyCodeBlock(btn) {
    const pre = btn.parentNode.nextElementSibling;
    const code = pre.querySelector('code');
    
    navigator.clipboard.writeText(code.innerText).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy code';
        }, 2000);
    });
}

function exportChats() {
    if (state.conversations.length === 0) {
        alert('No conversations to export.');
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `boba_i_chats_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
