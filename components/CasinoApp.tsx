
import React, { useState, useEffect, useRef } from 'react';
import { audioManager } from '../services/audioService';

interface CasinoAppProps {
    money: number;
    onUpdateMoney: (amount: number) => void;
    onClose: () => void;
}

type GameMode = 'menu' | 'blackjack' | 'slots' | 'roulette' | 'hilow';

// --- RIGGING CONSTANTS ---
const WIN_CHANCE = 0.33; // 33% Win Rate

// --- CARD UTILS ---
const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getRandomCard = () => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const valIdx = Math.floor(Math.random() * VALUES.length);
    const value = VALUES[valIdx];
    let num = parseInt(value);
    if (isNaN(num)) {
        if (value === 'A') num = 11;
        else num = 10;
    }
    return { suit, value, num, color: (suit === '♥' || suit === '♦') ? 'text-red-500' : 'text-black' };
};

const calculateHand = (hand: any[]) => {
    let sum = 0;
    let aces = 0;
    hand.forEach(c => {
        sum += c.num;
        if (c.value === 'A') aces++;
    });
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
};

// --- COMPONENT ---
const CasinoApp: React.FC<CasinoAppProps> = ({ money, onUpdateMoney, onClose }) => {
    const [game, setGame] = useState<GameMode>('menu');
    const [bet, setBet] = useState(100);
    const [message, setMessage] = useState('');

    // BLACKJACK STATE
    const [bjPlayer, setBjPlayer] = useState<any[]>([]);
    const [bjDealer, setBjDealer] = useState<any[]>([]);
    const [bjState, setBjState] = useState<'betting' | 'playing' | 'dealer' | 'end'>('betting');

    // SLOTS STATE
    const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
    const [isSpinning, setIsSpinning] = useState(false);

    // ROULETTE STATE
    const [rouletteChoice, setRouletteChoice] = useState<'RED' | 'BLACK' | 'GREEN' | null>(null);
    const [rouletteResult, setRouletteResult] = useState<number | null>(null);
    const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);

    // HILOW STATE
    const [hlCard, setHlCard] = useState<any>(null);
    const [hlState, setHlState] = useState<'betting' | 'playing'>('betting');

    // --- SHARED ---
    const adjustBet = (amount: number) => {
        const newBet = Math.max(10, Math.min(money, bet + amount));
        setBet(newBet);
        audioManager.playUI('hover');
    };

    // --- BLACKJACK LOGIC ---
    const startBlackjack = () => {
        if (money < bet) {
            setMessage("Insufficient Funds!");
            audioManager.playUI('error');
            return;
        }
        onUpdateMoney(money - bet);
        const p1 = getRandomCard();
        const p2 = getRandomCard();
        const d1 = getRandomCard();
        const d2 = getRandomCard();
        setBjPlayer([p1, p2]);
        setBjDealer([d1, d2]);
        setBjState('playing');
        setMessage('');
        audioManager.playUI('click'); // Deal sound
        
        // Instant Blackjack Check
        const pSum = calculateHand([p1, p2]);
        if (pSum === 21) {
            handleBjEnd([p1, p2], [d1, d2], bet);
        }
    };

    const hitBlackjack = () => {
        const card = getRandomCard();
        const newHand = [...bjPlayer, card];
        setBjPlayer(newHand);
        audioManager.playUI('click');
        if (calculateHand(newHand) > 21) {
            setBjState('end');
            setMessage('BUST! Dealer Wins.');
            audioManager.playUI('error');
        }
    };

    const standBlackjack = () => {
        setBjState('dealer');
        let dHand = [...bjDealer];
        const playerVal = calculateHand(bjPlayer);
        
        // Rigging: Determine if player should win this round
        const shouldPlayerWin = Math.random() < WIN_CHANCE;

        const playDealer = async () => {
            while (calculateHand(dHand) < 17) {
                await new Promise(r => setTimeout(r, 800));
                
                let card = getRandomCard();
                
                // RIGGING: If dealer needs to win (player should lose)
                if (!shouldPlayerWin) {
                    const currentVal = calculateHand(dHand);
                    // If the random card makes dealer bust, try to pick a smaller card
                    if (calculateHand([...dHand, card]) > 21) {
                        let safeAttempts = 0;
                        while (calculateHand([...dHand, card]) > 21 && safeAttempts < 10) {
                            card = getRandomCard();
                            safeAttempts++;
                        }
                    }
                    
                    // Super Rig: If dealer is still losing to player and can take a card without busting, force a card that beats player?
                    // Implemented loosely by avoiding busts.
                }

                dHand = [...dHand, card];
                setBjDealer(dHand);
                audioManager.playUI('click');
            }
            handleBjEnd(bjPlayer, dHand, bet);
        };
        playDealer();
    };

    const handleBjEnd = (pHand: any[], dHand: any[], currentBet: number) => {
        const pSum = calculateHand(pHand);
        const dSum = calculateHand(dHand);
        setBjState('end');

        if (pSum > 21) {
            setMessage('BUST! Dealer Wins.');
            audioManager.playUI('error');
        } else if (dSum > 21) {
            setMessage('Dealer Bust! YOU WIN!');
            onUpdateMoney(money + currentBet * 2); 
            audioManager.playUI('success');
        } else if (pSum > dSum) {
            const isBj = pSum === 21 && pHand.length === 2;
            const winAmount = isBj ? Math.floor(currentBet * 2.5) : currentBet * 2;
            setMessage(isBj ? 'BLACKJACK! Pays 3:2' : 'YOU WIN!');
            onUpdateMoney(money + winAmount);
            audioManager.playUI('success');
        } else if (pSum < dSum) {
            setMessage('Dealer Wins.');
            audioManager.playUI('error');
        } else {
            setMessage('PUSH. Bet Returned.');
            onUpdateMoney(money + currentBet);
        }
    };

    // --- SLOTS LOGIC ---
    const SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣'];
    
    const spinSlots = async () => {
        if (money < bet) {
            setMessage("Insufficient Funds!");
            audioManager.playUI('error');
            return;
        }
        onUpdateMoney(money - bet);
        setIsSpinning(true);
        setMessage('');
        audioManager.playUI('click');

        // Animation
        const interval = setInterval(() => {
            setReels([
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
            ]);
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            
            // RIGGING LOGIC
            const shouldWin = Math.random() < WIN_CHANCE;
            let final = [];

            if (shouldWin) {
                // Force a win (3 matching or 2 matching)
                const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                if (Math.random() > 0.5) {
                    final = [sym, sym, sym]; // Jackpot
                } else {
                    const extra = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                    final = [sym, sym, extra]; // 2 match
                }
            } else {
                // Force a loss (ensure mismatch)
                const s1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                let s2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                while (s2 === s1) s2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                let s3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                while (s3 === s1 || s3 === s2) s3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                final = [s1, s2, s3];
            }

            setReels(final);
            setIsSpinning(false);
            
            // Check Win
            if (final[0] === final[1] && final[1] === final[2]) {
                const sym = final[0];
                let mul = 0;
                if (sym === '🍒') mul = 10;
                if (sym === '🍋') mul = 20;
                if (sym === '🍇') mul = 50;
                if (sym === '💎') mul = 100;
                if (sym === '7️⃣') mul = 500; // Jackpot
                
                onUpdateMoney(money + bet * mul);
                setMessage(`JACKPOT! ${mul}x Win!`);
                audioManager.playUI('success');
            } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
                if (final.filter(s => s === '🍒').length >= 2) {
                    onUpdateMoney(money + bet * 2);
                    setMessage('Nice! 2x Win.');
                    audioManager.playUI('success');
                } else {
                    setMessage('So Close!');
                }
            } else {
                setMessage('Try Again.');
            }
        }, 2000);
    };

    // --- ROULETTE LOGIC ---
    const spinRoulette = async () => {
        if (!rouletteChoice) return;
        if (money < bet) {
            setMessage("Insufficient Funds!");
            audioManager.playUI('error');
            return;
        }
        onUpdateMoney(money - bet);
        setIsRouletteSpinning(true);
        setMessage('');
        
        // Animation
        let count = 0;
        const interval = setInterval(() => {
            setRouletteResult(Math.floor(Math.random() * 37));
            count++;
            if (count > 20) {
                clearInterval(interval);
                finishRoulette();
            }
        }, 100);
    };

    const finishRoulette = () => {
        // RIGGING
        const shouldWin = Math.random() < WIN_CHANCE;
        
        let result = Math.floor(Math.random() * 37); // 0-36
        
        // Determine color of the random result
        const getColor = (res: number) => {
            if (res === 0) return 'GREEN';
            if ((res >= 1 && res <= 10) || (res >= 19 && res <= 28)) {
                return (res % 2 !== 0) ? 'RED' : 'BLACK';
            } else {
                return (res % 2 !== 0) ? 'BLACK' : 'RED';
            }
        };

        let resultColor = getColor(result);

        // Apply Rigging
        if (shouldWin) {
            // Ensure result matches choice
            let attempts = 0;
            while (resultColor !== rouletteChoice && attempts < 50) {
                result = Math.floor(Math.random() * 37);
                resultColor = getColor(result);
                attempts++;
            }
        } else {
            // Ensure result DOES NOT match choice
            let attempts = 0;
            while (resultColor === rouletteChoice && attempts < 50) {
                result = Math.floor(Math.random() * 37);
                resultColor = getColor(result);
                attempts++;
            }
        }

        setRouletteResult(result);
        setIsRouletteSpinning(false);

        if (rouletteChoice === resultColor) {
            const multiplier = resultColor === 'GREEN' ? 14 : 2;
            onUpdateMoney(money + bet * multiplier);
            setMessage(`WIN! ${resultColor} pays ${multiplier}x`);
            audioManager.playUI('success');
        } else {
            setMessage(`Result: ${resultColor} ${result}. You lost.`);
            audioManager.playUI('error');
        }
        setRouletteChoice(null);
    };

    // --- HI-LOW LOGIC ---
    const startHiLow = () => {
        if (money < bet) {
            setMessage("Insufficient Funds!");
            audioManager.playUI('error');
            return;
        }
        onUpdateMoney(money - bet);
        setHlCard(getRandomCard());
        setHlState('playing');
        setMessage('');
    };

    const guessHiLow = (guess: 'HI' | 'LO') => {
        const prevVal = hlCard.num;
        let nextCard = getRandomCard();
        
        // RIGGING
        const shouldWin = Math.random() < WIN_CHANCE;
        
        const checkWin = (c: any) => {
            if (guess === 'HI' && c.num >= prevVal) return true;
            if (guess === 'LO' && c.num <= prevVal) return true;
            return false;
        };

        let isWin = checkWin(nextCard);

        if (shouldWin && !isWin) {
            // Try to find a winning card
            for(let i=0; i<10; i++) {
                const temp = getRandomCard();
                if (checkWin(temp)) {
                    nextCard = temp;
                    isWin = true;
                    break;
                }
            }
        } else if (!shouldWin && isWin) {
            // Try to find a losing card
            for(let i=0; i<10; i++) {
                const temp = getRandomCard();
                if (!checkWin(temp)) {
                    nextCard = temp;
                    isWin = false;
                    break;
                }
            }
        }

        const nextVal = nextCard.num;
        setHlCard(nextCard);
        setHlState('betting'); 

        if (isWin) {
            onUpdateMoney(money + bet * 2);
            setMessage('Correct! 2x Payout.');
            audioManager.playUI('success');
        } else {
            setMessage('Wrong! House Wins.');
            audioManager.playUI('error');
        }
    };

    // --- RENDERERS ---

    const renderCard = (card: any, hidden: boolean = false) => {
        if (hidden) {
            return (
                <div className="w-12 h-16 md:w-16 md:h-24 bg-red-900 border-2 border-white rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_#fff_1px,_transparent_1px)] bg-[size:4px_4px]"></div>
                </div>
            );
        }
        return (
            <div className={`w-12 h-16 md:w-16 md:h-24 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-between p-1 shadow-lg ${card.color} animate-fade-in`}>
                <div className="text-xs md:text-sm font-bold self-start">{card.value}</div>
                <div className="text-xl md:text-3xl">{card.suit}</div>
                <div className="text-xs md:text-sm font-bold self-end rotate-180">{card.value}</div>
            </div>
        );
    };

    const renderMenu = () => (
        <div className="flex flex-col gap-4 h-full p-2">
            <button onClick={() => setGame('blackjack')} className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-4 rounded-xl border border-emerald-400 shadow-lg flex items-center gap-4 hover:scale-[1.02] transition-transform">
                <div className="text-4xl">♠️</div>
                <div className="text-left">
                    <div className="font-gta text-xl text-white">BLACKJACK</div>
                    <div className="text-xs text-emerald-200">Beat the dealer to 21</div>
                </div>
            </button>
            <button onClick={() => setGame('roulette')} className="bg-gradient-to-r from-red-900 to-red-700 p-4 rounded-xl border border-red-400 shadow-lg flex items-center gap-4 hover:scale-[1.02] transition-transform">
                <div className="text-4xl">🔴</div>
                <div className="text-left">
                    <div className="font-gta text-xl text-white">ROULETTE</div>
                    <div className="text-xs text-red-200">Red, Black, or Green?</div>
                </div>
            </button>
            <button onClick={() => setGame('slots')} className="bg-gradient-to-r from-purple-900 to-purple-700 p-4 rounded-xl border border-purple-400 shadow-lg flex items-center gap-4 hover:scale-[1.02] transition-transform">
                <div className="text-4xl">🎰</div>
                <div className="text-left">
                    <div className="font-gta text-xl text-white">SLOTS</div>
                    <div className="text-xs text-purple-200">Spin to win big!</div>
                </div>
            </button>
            <button onClick={() => setGame('hilow')} className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 rounded-xl border border-blue-400 shadow-lg flex items-center gap-4 hover:scale-[1.02] transition-transform">
                <div className="text-4xl">🃏</div>
                <div className="text-left">
                    <div className="font-gta text-xl text-white">HIGH LOW</div>
                    <div className="text-xs text-blue-200">Guess the next card</div>
                </div>
            </button>
        </div>
    );

    const renderBetControls = () => (
        <div className="bg-black/50 p-2 rounded-xl flex items-center justify-between mb-4 border border-white/10">
            <button onClick={() => adjustBet(-100)} className="w-8 h-8 bg-red-600 rounded text-white font-bold">-</button>
            <div className="font-mono text-yellow-400 text-lg">BET: ${bet}</div>
            <button onClick={() => adjustBet(100)} className="w-8 h-8 bg-green-600 rounded text-white font-bold">+</button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-zinc-900 text-white relative">
            {/* Header */}
            <div className="bg-yellow-600 p-4 pt-12 pb-2 text-center shadow-lg relative z-10 shrink-0">
                <div className="absolute top-10 left-4 text-black text-2xl cursor-pointer" onClick={() => {
                    if (game === 'menu') onClose(); else { setGame('menu'); setMessage(''); }
                    audioManager.playUI('back');
                }}>
                    <i className="fas fa-arrow-left"></i>
                </div>
                <h2 className="font-gta text-2xl tracking-widest text-black drop-shadow-sm">HIGH ROLLERS</h2>
                <div className="flex justify-center items-center gap-2 text-black font-mono font-bold mt-1 bg-yellow-500/50 rounded-full px-4 py-0.5 mx-auto w-fit">
                    <i className="fas fa-coins"></i> ${money.toLocaleString()}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0f172a] relative">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                
                {game === 'menu' && renderMenu()}

                {game !== 'menu' && (
                    <div className="flex flex-col h-full relative z-10">
                        {game !== 'slots' && renderBetControls()}
                        
                        {/* MESSAGE AREA */}
                        <div className="h-8 text-center text-sm font-bold text-yellow-300 mb-2 drop-shadow-md animate-pulse">
                            {message}
                        </div>

                        {/* BLACKJACK */}
                        {game === 'blackjack' && (
                            <div className="flex-1 flex flex-col justify-between">
                                {/* Dealer */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-400">DEALER {bjState === 'end' ? `(${calculateHand(bjDealer)})` : ''}</span>
                                    <div className="flex gap-2">
                                        {bjDealer.map((c, i) => renderCard(c, i === 0 && bjState !== 'end' && bjState !== 'dealer'))}
                                        {bjDealer.length === 0 && <div className="w-12 h-16 border-2 border-white/20 rounded-lg"></div>}
                                    </div>
                                </div>

                                <div className="my-4 border-t border-white/10"></div>

                                {/* Player */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex gap-2">
                                        {bjPlayer.map((c, i) => renderCard(c))}
                                        {bjPlayer.length === 0 && <div className="w-12 h-16 border-2 border-white/20 rounded-lg"></div>}
                                    </div>
                                    <span className="text-xs text-gray-400">PLAYER {bjPlayer.length > 0 ? `(${calculateHand(bjPlayer)})` : ''}</span>
                                </div>

                                {/* Controls */}
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {bjState === 'betting' && (
                                        <button onClick={startBlackjack} className="col-span-2 bg-green-600 py-3 rounded-xl font-bold hover:bg-green-500 shadow-lg shadow-green-900/50">DEAL</button>
                                    )}
                                    {bjState === 'playing' && (
                                        <>
                                            <button onClick={hitBlackjack} className="bg-blue-600 py-3 rounded-xl font-bold hover:bg-blue-500">HIT</button>
                                            <button onClick={standBlackjack} className="bg-yellow-600 py-3 rounded-xl font-bold hover:bg-yellow-500">STAND</button>
                                        </>
                                    )}
                                    {bjState === 'end' && (
                                        <button onClick={() => setBjState('betting')} className="col-span-2 bg-gray-600 py-3 rounded-xl font-bold hover:bg-gray-500">PLAY AGAIN</button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SLOTS */}
                        {game === 'slots' && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                <div className="flex gap-2 bg-black p-4 rounded-2xl border-4 border-yellow-600 shadow-2xl">
                                    {reels.map((sym, i) => (
                                        <div key={i} className="w-16 h-24 bg-white rounded-lg flex items-center justify-center text-4xl shadow-inner overflow-hidden relative">
                                            <div className={isSpinning ? 'animate-bounce-short' : ''}>{sym}</div>
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="w-full">
                                    {renderBetControls()}
                                    <button 
                                        onClick={spinSlots} 
                                        disabled={isSpinning}
                                        className={`w-full py-4 rounded-xl font-bold text-xl shadow-lg transition-all active:scale-95 ${isSpinning ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 shadow-red-900/50'}`}
                                    >
                                        {isSpinning ? 'SPINNING...' : 'SPIN'}
                                    </button>
                                </div>
                                
                                <div className="text-xs text-gray-400 text-center bg-black/30 p-2 rounded w-full">
                                    <p>7️⃣7️⃣7️⃣ = 500x | 💎💎💎 = 100x</p>
                                    <p>🍇🍇🍇 = 50x | 🍋🍋🍋 = 20x | 🍒🍒🍒 = 10x</p>
                                </div>
                            </div>
                        )}

                        {/* ROULETTE */}
                        {game === 'roulette' && (
                            <div className="flex-1 flex flex-col items-center justify-between">
                                {/* Wheel Display */}
                                <div className="relative w-48 h-48 rounded-full border-8 border-yellow-900 bg-black flex items-center justify-center shadow-2xl mb-4">
                                    <div className={`absolute inset-0 rounded-full border-4 border-dashed border-white/20 ${isRouletteSpinning ? 'animate-spin' : ''}`} style={{animationDuration: '0.5s'}}></div>
                                    <div className={`text-5xl font-gta ${
                                        rouletteResult === 0 ? 'text-green-500' :
                                        (rouletteResult === null) ? 'text-gray-600' :
                                        ([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(rouletteResult) ? 'text-red-500' : 'text-white')
                                    }`}>
                                        {rouletteResult ?? '?'}
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setRouletteChoice('RED')}
                                        disabled={isRouletteSpinning}
                                        className={`py-4 rounded-xl font-bold bg-red-600 hover:bg-red-500 ${rouletteChoice === 'RED' ? 'ring-4 ring-yellow-400' : ''}`}
                                    >
                                        RED (2x)
                                    </button>
                                    <button 
                                        onClick={() => setRouletteChoice('GREEN')}
                                        disabled={isRouletteSpinning}
                                        className={`py-4 rounded-xl font-bold bg-green-600 hover:bg-green-500 ${rouletteChoice === 'GREEN' ? 'ring-4 ring-yellow-400' : ''}`}
                                    >
                                        0 (14x)
                                    </button>
                                    <button 
                                        onClick={() => setRouletteChoice('BLACK')}
                                        disabled={isRouletteSpinning}
                                        className={`py-4 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 ${rouletteChoice === 'BLACK' ? 'ring-4 ring-yellow-400' : ''}`}
                                    >
                                        BLK (2x)
                                    </button>
                                </div>

                                <button 
                                    onClick={spinRoulette}
                                    disabled={isRouletteSpinning || !rouletteChoice}
                                    className={`w-full py-3 mt-4 rounded-xl font-bold text-lg shadow-lg transition-all ${!rouletteChoice || isRouletteSpinning ? 'bg-gray-700 text-gray-500' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                                >
                                    SPIN WHEEL
                                </button>
                            </div>
                        )}

                        {/* HIGH LOW */}
                        {game === 'hilow' && (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="mb-8 scale-150">
                                    {hlCard ? renderCard(hlCard) : <div className="w-12 h-16 border-2 border-white/20 rounded-lg"></div>}
                                </div>

                                {hlState === 'betting' && (
                                    <button onClick={startHiLow} className="w-full bg-green-600 py-4 rounded-xl font-bold text-xl hover:bg-green-500 shadow-lg">
                                        DEAL CARD
                                    </button>
                                )}

                                {hlState === 'playing' && (
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <button onClick={() => guessHiLow('HI')} className="bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-500 shadow-lg">
                                            HIGHER
                                        </button>
                                        <button onClick={() => guessHiLow('LO')} className="bg-red-600 py-4 rounded-xl font-bold hover:bg-red-500 shadow-lg">
                                            LOWER
                                        </button>
                                    </div>
                                )}
                                <div className="mt-6 text-xs text-gray-400">
                                    Ace is 11 or 1. Wait, Ace is High/Low? Let's say Ace is High (11).
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CasinoApp;
