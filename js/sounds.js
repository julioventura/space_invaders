/*
  sounds.js - Sistema de som otimizado para Space Invaders
*/

class SoundManager {
    constructor() {
        this.isInitialized = false;
        this.pendingInit = false;
        
        // Para o som dos invasores
        this.invaderFrequencies = [150, 120];
        this.currentInvaderSound = 0;
        this.invaderSoundSpeed = 1.0;
        this.isMuted = false;
        
        // Contador para reduzir a frequência dos sons
        this.stepCounter = 0;
        this.stepModulo = 2; // REDUZIDO para 2 (era 4) - Toca som mais frequentemente
        
        // Recursos compartilhados para economizar memória
        this.activeOscillators = 0;
        this.maxOscillators = 5; // Limite máximo de osciladores ao mesmo tempo

        // Volume inicial
        this.volume = 0.3;
        this.volumeStep = 0.05; // 5% por ajuste
    }
    
    init() {
        if (this.isInitialized || this.pendingInit) return;
        
        this.pendingInit = true;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume; // Usar a variável volume em vez do valor fixo
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            this.pendingInit = false;
            
            console.log("Sistema de áudio inicializado com sucesso");
        } catch (e) {
            console.warn("Web Audio API não suportada:", e);
            this.audioContext = null;
            this.pendingInit = false;
        }
    }
    
    // Gerenciamento simplificado de recursos de áudio
    startAudioNode() {
        if (this.activeOscillators >= this.maxOscillators) {
            return false;
        }
        this.activeOscillators++;
        return true;
    }
    
    releaseAudioNode() {
        if (this.activeOscillators > 0) {
            this.activeOscillators--;
        }
    }
    
    activate() {
        if (!this.isInitialized) {
            this.init();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    toggleMute() {
        if (!this.isInitialized) return;
        
        this.isMuted = !this.isMuted;
        this.updateVolume();
    }
    
    // Método para aumentar o volume
    increaseVolume() {
        if (!this.isInitialized) return;
        
        this.volume = Math.min(1.0, this.volume + this.volumeStep);
        this.updateVolume();
        console.log("Volume: " + Math.round(this.volume * 100) + "%");
    }
    
    // Método para diminuir o volume
    decreaseVolume() {
        if (!this.isInitialized) return;
        
        this.volume = Math.max(0.0, this.volume - this.volumeStep);
        this.updateVolume();
        console.log("Volume: " + Math.round(this.volume * 100) + "%");
    }
    
    // Método para atualizar o volume no masterGain
    updateVolume() {
        if (this.masterGain) {
            if (this.isMuted) {
                this.masterGain.gain.value = 0;
            } else {
                this.masterGain.gain.value = this.volume;
            }
        }
    }
    
    // Som dos passos dos invasores - SIMPLIFICADO
    playInvaderStep() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            
            // FATOR CRÍTICO: Tocar o som apenas a cada X passos
            this.stepCounter = (this.stepCounter + 1) % this.stepModulo;
            if (this.stepCounter !== 0) {
                return; // Pula a maioria dos sons
            }
            
            if (!this.startAudioNode()) return;
            
            // Usa um único oscilador com forma simplificada
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = this.invaderFrequencies[this.currentInvaderSound];
            this.currentInvaderSound = (this.currentInvaderSound + 1) % 2;
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.15 / this.invaderSoundSpeed;
            const endTime = currentTime + duration;
            
            // AUMENTADO para 0.25 (era 0.15) - Volume inicial mais alto
            gain.gain.setValueAtTime(0.25, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            oscillator.start(currentTime);
            oscillator.stop(endTime);
            
            // Libera o recurso quando o som termina
            setTimeout(() => {
                this.releaseAudioNode();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de invasor:", e);
            this.releaseAudioNode(); // Garante liberação do recurso mesmo em caso de erro
        }
    }
    
    // Som do tiro - RESTAURADO ao original com laser
    playShootSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            
            if (!this.startAudioNode()) return;
            
            // Usando dois osciladores como no som original
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Som original de laser
            oscillator1.type = 'sawtooth';
            oscillator1.frequency.value = 900;
            
            oscillator2.type = 'sine';
            oscillator2.frequency.value = 1800;
            
            oscillator1.connect(gain);
            oscillator2.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.2;
            const endTime = currentTime + duration;
            
            // Envelope original
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.4, currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            // Modulação de frequência simplificada para o efeito laser
            oscillator1.frequency.setValueAtTime(1200, currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(500, endTime);
            
            oscillator1.start(currentTime);
            oscillator2.start(currentTime);
            oscillator1.stop(endTime);
            oscillator2.stop(endTime);
            
            // Libera o recurso quando o som termina
            setTimeout(() => {
                this.releaseAudioNode();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de tiro:", e);
            this.releaseAudioNode(); // Garante liberação
        }
    }
    
    // Outros sons simplificados para máxima estabilidade
    playExplosionSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            
            if (!this.startAudioNode()) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 80;
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.2;
            const endTime = currentTime + duration;
            
            gain.gain.setValueAtTime(0.2, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            oscillator.start(currentTime);
            oscillator.stop(endTime);
            
            setTimeout(() => {
                this.releaseAudioNode();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de explosão:", e);
            this.releaseAudioNode();
        }
    }
    
    // Som para quando o jogador é atingido – efeito dramático com descida de frequência
    playPlayerHitSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            if (!this.startAudioNode()) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Usando "triangle" para um timbre encorpado e expressivo
            oscillator.type = 'triangle';
            const currentTime = this.audioContext.currentTime;
            const duration = 0.5; // duração para o efeito dramático
            // Inicia em 200 Hz e desce para 50 Hz
            oscillator.frequency.setValueAtTime(200, currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, currentTime + duration);
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            // Cria um envelope com volume moderado que decai para zero
            gain.gain.setValueAtTime(0.5, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            setTimeout(() => {
                this.releaseAudioNode();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de jogador atingido:", e);
            this.releaseAudioNode();
        }
    }
    
    // Sequência de vitória RESTAURADA
    playVictorySound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            
            if (!this.startAudioNode()) return;
            
            // Sequência ascendente de tons (versão original restaurada)
            const tones = [261.63, 329.63, 392.00, 523.25]; // Notas C, E, G, C (oitava acima)
            const duration = 0.2;
            
            // Toca os 4 tons em sequência
            for (let i = 0; i < tones.length; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                oscillator.type = 'square';
                oscillator.frequency.value = tones[i];
                
                oscillator.connect(gain);
                gain.connect(this.masterGain);
                
                const startTime = this.audioContext.currentTime + (i * duration);
                const endTime = startTime + duration;
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
                gain.gain.linearRampToValueAtTime(0.2, endTime - 0.05);
                gain.gain.linearRampToValueAtTime(0, endTime);
                
                oscillator.start(startTime);
                oscillator.stop(endTime);
            }
            
            // Libera o recurso após a sequência completa
            setTimeout(() => {
                this.releaseAudioNode();
            }, tones.length * duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de vitória:", e);
            this.releaseAudioNode();
        }
    }
    
    // Método para tocar som de GAME OVER – sequência de vitória invertida
    playGameOverSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            // Zera os osciladores pendentes para garantir a criação de novos
            this.activeOscillators = 0;
            if (!this.startAudioNode()) return;
            
            // Sequência de vitória original: [261.63, 329.63, 392.00, 523.25]
            // Para Game Over, usamos a sequência invertida: [523.25, 392.00, 329.63, 261.63]
            const tones = [523.25, 392.00, 329.63, 261.63];
            const duration = 0.2; // duração de cada nota
            let currentTime = this.audioContext.currentTime;
            
            tones.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                oscillator.type = 'square'; // timbre clássico
                oscillator.frequency.value = freq;
                oscillator.connect(gain);
                gain.connect(this.masterGain);
                
                const toneStart = currentTime + index * duration;
                const toneEnd = toneStart + duration;
                
                gain.gain.setValueAtTime(0, toneStart);
                gain.gain.linearRampToValueAtTime(0.2, toneStart + 0.01);
                gain.gain.linearRampToValueAtTime(0.2, toneEnd - 0.05);
                gain.gain.linearRampToValueAtTime(0, toneEnd);
                
                oscillator.start(toneStart);
                oscillator.stop(toneEnd);
            });
            
            const totalDuration = tones.length * duration;
            setTimeout(() => {
                this.releaseAudioNode();
            }, totalDuration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de GAME OVER:", e);
            this.releaseAudioNode();
        }
    }

    // Método atualizado para o som de GAME OVER: reproduz a sequência de vitória em ordem invertida
    playGameOverSound2() {
        try {
            if (!this.isInitialized || this.isMuted) return;

            if (!this.startAudioNode()) return;

            // Sequência ascendente de tons (versão original restaurada)
            const tones = [523.25, 392.00, 329.63, 261.63 ]; // Notas C, E, G, C (oitava acima)
            const duration = 0.2;

            // Toca os 4 tons em sequência
            for (let i = 0; i < tones.length; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                oscillator.type = 'square';
                oscillator.frequency.value = tones[i];

                oscillator.connect(gain);
                gain.connect(this.masterGain);

                const startTime = this.audioContext.currentTime + (i * duration);
                const endTime = startTime + duration;

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
                gain.gain.linearRampToValueAtTime(0.2, endTime - 0.05);
                gain.gain.linearRampToValueAtTime(0, endTime);

                oscillator.start(startTime);
                oscillator.stop(endTime);
            }

            // Libera o recurso após a sequência completa
            setTimeout(() => {
                this.releaseAudioNode();
            }, tones.length * duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de vitória:", e);
            this.releaseAudioNode();
        }
    }

    // Método para tocar uma explosão curta e audível (usado na linha do topo)
    playShortExplosionSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            if (!this.startAudioNode()) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 100; // tom um pouco mais baixo
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.1; // duração de 0.1 segundo
            gain.gain.setValueAtTime(0.35, currentTime); // ganho inicial maior
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            setTimeout(() => { this.releaseAudioNode(); }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de explosão curta:", e);
            this.releaseAudioNode();
        }
    }
    
    // Som para quando o tiro atinge a linha de topo
    playTopLineHitSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            if (!this.startAudioNode()) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.type = 'triangle';  // Timbre distinto
            oscillator.frequency.value = 300; // Frequência alterada para mais clareza
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.15; // Duração curta
            gain.gain.setValueAtTime(0.4, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            setTimeout(() => {
                this.releaseAudioNode();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de linha de topo:", e);
            this.releaseAudioNode();
        }
    }
    
    // Método atualizado para o som quando um invasor é atingido:
    // Som mais agudo, seco e explosivo
    playInvaderHitSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            if (!this.startAudioNode()) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.type = 'square'; // Som curto e agressivo
            oscillator.frequency.value = 400; // Frequência mais aguda
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.05; // Duração muito curta para efeito explosivo
            gain.gain.setValueAtTime(0.8, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            setTimeout(() => {
                this.releaseAudioNode();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Erro ao tocar som de invasor atingido:", e);
            this.releaseAudioNode();
        }
    }
    
    updateInvaderSpeed(remainingPercentage) {
        try {
            if (!this.isInitialized) return;
            
            this.invaderSoundSpeed = 1.0 + (1 - remainingPercentage) * 2;
            this.invaderSoundSpeed = Math.min(this.invaderSoundSpeed, 3.0);
            
            // Ajuste do modulador para SEMPRE tocar com frequência
            this.stepModulo = 2; // Sempre toca som a cada 2 passos
        } catch (e) {
            console.warn("Erro ao atualizar velocidade do som:", e);
        }
    }
}