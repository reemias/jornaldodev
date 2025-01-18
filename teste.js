function isSupportedVideoFile(file) {
    const supportedMimeTypes = [
        'video/mp4',             // Tipos de MIME comuns para MP4
        'video/x-m4v',
        'video/quicktime'       // Inclui outros tipos relacionados a MP4
    ];

    return supportedMimeTypes.includes(file.type);
}

document.addEventListener('DOMContentLoaded', () => {
    // Seu código existente aqui...

    botaoEnviar.addEventListener('click', () => {
        const userName = localStorage.getItem('userName') || 'Anônimo';
        const profileImageUrl = localStorage.getItem('profileImageUrl') || 'default-profile.png';
        const message = {
            name: userName,
            text: inputMensagem.value,
            likes: 0,
            profileImageUrl: profileImageUrl,
            timestamp: Date.now(),
            imageUrl: null,
            videoUrl: null
        };

        if (inputFoto.files.length > 0) {
            // Código existente para imagens...
        } else if (inputVideo.files.length > 0) {
            const file = inputVideo.files[0];
            if (isSupportedVideoFile(file)) {
                const fileReader = new FileReader();
                fileReader.onload = function(e) {
                    message.videoUrl = e.target.result;
                    database.ref('messages').push(message)
                        .then(() => {
                            inputMensagem.value = '';
                            inputVideo.value = '';
                        })
                        .catch((error) => {
                            console.error("Erro ao enviar a mensagem:", error);
                        });
                };
                fileReader.readAsDataURL(file);
            } else {
                alert('Formato de vídeo não suportado. Por favor, envie um vídeo MP4.');
            }
        } else {
            if (inputMensagem.value.trim() !== "") {
                database.ref('messages').push(message)
                    .then(() => {
                        inputMensagem.value = '';
                    })
                    .catch((error) => {
                        console.error("Erro ao enviar a mensagem:", error);
                    });
            }
        }
    });

    // Seu código existente continua aqui...
});
