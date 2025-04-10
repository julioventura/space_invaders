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
    }
    
    init() {
        if (this.isInitialized || this.pendingInit) return;
        
        this.pendingInit = true;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3;
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
        this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
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
    
    playPlayerHitSound() {
        try {
            if (!this.isInitialized || this.isMuted) return;
            
            if (!this.startAudioNode()) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 150;
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            const currentTime = this.audioContext.currentTime;
            const duration = 0.3;
            const endTime = currentTime + duration;
            
            gain.gain.setValueAtTime(0.2, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            oscillator.frequency.setValueAtTime(150, currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(40, endTime);
            
            oscillator.start(currentTime);
            oscillator.stop(endTime);
            
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