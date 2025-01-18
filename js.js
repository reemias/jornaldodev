// Função para normalizar o texto removendo acentos e caracteres especiais
function normalizeText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Função para calcular a distância de Levenshtein entre duas strings
function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] 
                      : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }

    return matrix[b.length][a.length];
}

// Função para calcular a similaridade de strings usando a distância de Levenshtein
function calculateSimilarity(str1, str2) {
    str1 = normalizeText(str1);
    str2 = normalizeText(str2);

    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1.0 : 1.0 - (levenshteinDistance(str1, str2) / maxLen);
}

let awaitingUserResponse = false;
let currentQuestion = '';
let contextHistory = [];

// Carregar respostas salvas do localStorage
let savedResponses = JSON.parse(localStorage.getItem('savedResponses')) || {};

async function processInput() {
    const userInput = document.getElementById('user-input').value.trim();
    if (!userInput) return;

    displayMessage(userInput, 'user');
    document.getElementById('user-input').value = '';
    contextHistory.push(userInput);
    showLoading();

    setTimeout(async () => {
        if (awaitingUserResponse) {
            saveNewResponse(currentQuestion, userInput);
            awaitingUserResponse = false;
            currentQuestion = '';
            hideLoading();
            displayMessage(`Obrigado! Sua resposta foi salva.`, 'ai');
            return;
        }

        if (userInput.toLowerCase().startsWith('pesquise sobre')) {
            await searchAndDisplayResults(userInput.substring(14).trim());
            hideLoading();
            return;
        }

        const normalizedInput = normalizeText(userInput);
        if (savedResponses[normalizedInput]) {
            hideLoading();
            displayMessage(savedResponses[normalizedInput], 'ai');
            return;
        }

        const predefinedResponses = await fetch('respostas.json')
            .then(response => response.json())
            .catch(error => {
                hideLoading();
                displayMessage(`Erro ao carregar respostas prontas: ${error.message}`, 'ai');
                return {};
            });

        let bestMatch = '';
        let highestSimilarity = 0;

        for (const [question, answer] of Object.entries(predefinedResponses)) {
            const similarity = calculateSimilarity(userInput, question);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = answer;
            }
        }

        const similarityThreshold = 0.5;
        if (highestSimilarity >= similarityThreshold) {
            hideLoading();
            displayMessage(bestMatch, 'ai');
        } else {
            currentQuestion = userInput;
            awaitingUserResponse = true;
            hideLoading();
            displayMessage(`Eu não tenho uma resposta para isso agora. Você sabe a resposta para a pergunta: "${userInput}"?`, 'ai');
        }
    }, 3000);
}

async function search(query, engine) {
    const urlMap = {
        'duckduckgo': `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=h_&ia=web`,
        'wikipedia': `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    };

    const response = await fetch(urlMap[engine]);
    if (!response.ok) throw new Error('Erro na solicitação de busca');
    const data = await response.json();

    if (engine === 'duckduckgo') {
        return data.RelatedTopics.slice(0, 3).filter(topic => topic.FirstURL && topic.Text).map((topic, index) => ({
            title: `Opção ${index + 1}`,
            url: topic.FirstURL,
            snippet: topic.Text
        }));
    }

    return data.query.search.slice(0, 3).map((result, index) => ({
        title: `Opção ${index + 1}: ${result.title}`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
        snippet: result.snippet
    }));
}

async function searchAndDisplayResults(query) {
    try {
        const [duckDuckGoResults, wikiResults] = await Promise.all([search(query, 'duckduckgo'), search(query, 'wikipedia')]);

        let responses = '';
        if (duckDuckGoResults.length > 0) {
            responses += '<strong>Resultados do DuckDuckGo:</strong>';
            duckDuckGoResults.forEach(result => {
                responses += `<div><strong>${result.title}:</strong> <a href="${result.url}" target="_blank">${result.snippet}</a></div>`;
            });
        }

        if (wikiResults.length > 0) {
            responses += '<br/><strong>Resultados da Wikipedia:</strong>';
            wikiResults.forEach(result => {
                responses += `<div><strong>${result.title}:</strong> <a href="${result.url}" target="_blank">${result.title}</a><br/>${result.snippet}</div>`;
            });
        }

        if (!responses) {
            responses = 'Desculpe, não conseguimos encontrar resultados relevantes desta vez. Vamos tentar de novo?';
        }

        displayMessage(responses, 'ai');
    } catch (error) {
        displayMessage(`Desculpe, houve um erro ao realizar a busca: ${error.message}`, 'ai');
    }
}

function displayMessage(message, sender) {
    const chatContainer = document.getElementById('chat-container');
    const messageBubble = document.createElement('div');
    messageBubble.className = sender === 'user' ? 'user-message' : 'ai-message';
    messageBubble.innerHTML = message;
    chatContainer.appendChild(messageBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function saveNewResponse(question, answer) {
    const normalizedQuestion = normalizeText(question);
    savedResponses[normalizedQuestion] = answer;
    localStorage.setItem('savedResponses', JSON.stringify(savedResponses));
    console.log('Nova resposta salva:', question, answer);
}

function showLoading() {
    const chatContainer = document.getElementById('chat-container');
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'loader ai-message';
    loadingMessage.id = 'loading-indicator';
    loadingMessage.innerHTML = '<span></span><span></span><span></span>';
    chatContainer.appendChild(loadingMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideLoading() {
    const loadingMessage = document.getElementById('loading-indicator');
    if (loadingMessage) loadingMessage.remove();
}
