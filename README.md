# BOBA I — Premium Gemini Chatbot

BOBA I is a sleek, premium, client-side web application that provides a beautiful chat interface for Google's Gemini models. It allows you to converse with Gemini, upload images, dictate prompts via voice, customize model parameters, and manage your chat history, all within a browser.

---

## ✨ Features

- **🤖 Model Select**: Toggle dynamically between Gemini models (`Gemini 2.5 Flash`, `Gemini 2.5 Pro`, and `Gemini 1.5 Flash`).
- **🖼️ Multimodal Support**: Drag, drop, or select images (PNG, JPEG, WEBP) to query the model with both image and text inputs.
- **🎙️ Voice Input (Speech-to-Text)**: Dictate your prompts directly using browser Speech Recognition API.
- **🔊 Speech Output (Text-to-Speech)**: Read bot responses aloud using Speech Synthesis.
- **💻 Syntax Highlighting**: Auto-formatted code blocks with language labels and one-click copy buttons using Prism.js.
- **📝 Markdown Parsing**: Fully formatted responses including tables, bold text, lists, and links powered by Marked.js.
- **📂 Chat History Management**: Create new chats, rename existing ones, or delete chats with persistent saving.
- **⚙️ Deep Configuration**:
  - Custom **System Instructions** to change the chatbot's persona.
  - Adjustable **Temperature** (0.0 to 2.0) to fine-tune creativity.
- **📥 Export Capability**: Export all your chats and history to a JSON file.
- **🔒 Private & Secure**:
  - Your API Key is stored locally in your browser's `localStorage` and never sent to any server other than Google's Gemini API.
  - No database or backend required.

---

## 🛠️ Technology Stack

BOBA I is designed to be lightweight, performant, and dependency-free at runtime, leveraging CDNs for assets:
- **Core**: HTML5, Vanilla JavaScript (ES6+)
- **Styling**: Vanilla CSS3 (Custom variables, glassmorphic layout, modern UI)
- **Icons**: FontAwesome 6.4.0
- **Typography**: Google Fonts (Outfit & Inter)
- **Markdown Parsing**: [Marked.js](https://marked.js.org/)
- **Code Highlighting**: [Prism.js](https://prismjs.com/)

---

## 🚀 Getting Started

No installation, complex servers, or `npm install` packages are required.

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/your-username/BOBA-I.git
   ```
2. **Open the App**:
   Simply double-click the [index.html](file:///d:/PROJECTS/BOBAI/index.html) file or open it in any modern browser (Chrome, Edge, Safari, Firefox).
3. **Configure API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/) and grab a free API Key.
   - Click the **Settings & API Key** button in the bottom-left sidebar of BOBA I.
   - Paste your key and click **Save Settings**.
4. **Start Chatting!** 🚀

---

## 💡 Usage Tips

- **Image Prompts**: Click the paperclip icon next to the chat bar to attach an image, then write your query and send.
- **System Instructions**: Set the chatbot to act as a Senior Programmer, Translator, or creative writer by editing the instructions in the Settings modal.
- **Exporting History**: Use the "Export Chats" button in the sidebar to download a backup of all conversations.

---

## 🔒 Security & Privacy

Your data safety is a priority:
- **No Analytics/Tracking**: There are no telemetry scripts, database logs, or backend servers.
- **Local Storage**: Your API Key and chats remain locally in your browser cache. Clearing your browser data or clicking **Clear Key** will remove them completely.
