import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileUp, Loader2, BrainCircuit, Sparkles, CheckCircle, Award, Eye, X, ArrowLeft, Check } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import Confetti from 'react-confetti';

// --- Helper Components ---
const StatCard = ({ icon, label, value }) => (
    <div className="bg-navy-light p-4 rounded-lg shadow-md flex items-center space-x-4 border border-navy-lightest">
        {icon}
        <div>
            <p className="text-sm font-medium text-slate-dark">{label}</p>
            <p className="text-2xl font-bold text-slate-light">{value}</p>
        </div>
    </div>
);

const ReviewModal = ({ finalAnswers, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
        <div className="bg-navy-light rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-cyan-glow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-light">Review Your Answers</h2>
                <button onClick={onClose} className="text-slate-dark hover:text-cyan-glow"><X size={28} /></button>
            </div>
            <div>
                <h3 className="text-xl font-semibold text-cyan-glow mb-3 border-b border-navy-lightest pb-2">Multiple Choice Questions</h3>
                {finalAnswers.mcqs.map((mcq, index) => (
                    <div key={index} className="mb-4 p-3 bg-navy-dark rounded-md">
                        <p className="font-semibold text-slate-light">{index + 1}. {mcq.question}</p>
                        <p className={`mt-1 ${mcq.isCorrect ? 'text-green-400' : 'text-red-400'}`}> Your answer: <span className="font-bold">{mcq.userAnswer || "Not Answered"}</span> </p>
                        {!mcq.isCorrect && ( <p className="mt-1 text-green-400">Correct answer: <span className="font-bold">{mcq.correctAnswer}</span></p> )}
                    </div>
                ))}
                <h3 className="text-xl font-semibold text-cyan-glow mt-6 mb-3 border-b border-navy-lightest pb-2">Matching Questions</h3>
                {finalAnswers.matching.map((match, index) => (
                    <div key={index} className="mb-4 p-3 bg-navy-dark rounded-md">
                        <p className="font-semibold text-slate-light">Prompt: {match.prompt}</p>
                        <p className={`mt-1 ${match.isCorrect ? 'text-green-400' : 'text-red-400'}`}> Your answer: <span className="font-bold">{match.userAnswer || "Not Answered"}</span> </p>
                        {!match.isCorrect && ( <p className="mt-1 text-green-400">Correct answer: <span className="font-bold">{match.correctAnswer}</span></p> )}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const Draggable = ({ id, content }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
    return ( <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-2 bg-navy-lightest text-slate-light rounded-md text-center cursor-grab w-full">{content}</div> );
};

const Droppable = ({ id, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return ( <div ref={setNodeRef} className={`w-48 min-h-[3rem] p-1 flex justify-center items-center border-2 border-dashed rounded-md ${isOver ? 'border-cyan-glow bg-navy-lightest' : 'border-navy-lightest'}`}> {children || <span className="text-xs text-slate-dark">Drop here</span>} </div> );
};


const App = () => {
    // Core state
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState('');
    const [allQuestions, setAllQuestions] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // UI and Flow State
    const [currentView, setCurrentView] = useState('upload');
    const [currentDifficulty, setCurrentDifficulty] = useState(null);
    const [completionStatus, setCompletionStatus] = useState({ easy: false, medium: false, hard: false });
    const [showCongrats, setShowCongrats] = useState(false);
    
    // Exam State
    const [score, setScore] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [showReview, setShowReview] = useState(false);
    const [finalAnswers, setFinalAnswers] = useState(null);

    // Answer State
    const [userMCQAnswers, setUserMCQAnswers] = useState({});
    const [answerPool, setAnswerPool] = useState([]);
    const [droppedAnswers, setDroppedAnswers] = useState({});

    useEffect(() => {
        const allComplete = Object.values(completionStatus).every(status => status === true);
        if (allComplete) {
            setShowCongrats(true);
            setTimeout(() => setShowCongrats(false), 8000);
        }
    }, [completionStatus]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError('');
    };

    const handleUpload = async () => {
        if (!file) { setError('Please select a file first!'); return; }
        setIsLoading(true);
        startOver();

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await axios.post('http://localhost:3001/api/upload', formData);
            setSummary(response.data.summary);
            setAllQuestions(response.data.questions);
            setCurrentView('summary');
        } catch (err) {
            setError('Failed to process the document. Please try a different file.');
        } finally {
            setIsLoading(false);
        }
    };
    const handleMCQAnswerChange = (index, value) => {
    setUserMCQAnswers(prev => ({ ...prev, [index]: value }));
    };
    const startExam = (difficulty) => {
        setCurrentDifficulty(difficulty);
        const currentQuestions = allQuestions[difficulty];
        
        setUserMCQAnswers({});
        const initialDropped = {};
        currentQuestions.matching.prompts.forEach((p, i) => {
            initialDropped[`prompt-${i}`] = null;
        });
        setDroppedAnswers(initialDropped);
        setAnswerPool(currentQuestions.matching.answers.map((a, i) => ({ id: `answer-${i}`, content: a })));
        
        setCurrentView('exam');
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;
    
        const draggedItem = answerPool.find(a => a.id === active.id) || Object.values(droppedAnswers).find(item => item && item.id === active.id);
        if (!draggedItem) return;
    
        if (over.id === 'answerPool') {
            if (!answerPool.find(item => item.id === active.id)) {
                setAnswerPool(prevPool => [...prevPool, draggedItem]);
            }
            setDroppedAnswers(prevDropped => {
                const newDropped = { ...prevDropped };
                Object.keys(newDropped).forEach(key => {
                    if (newDropped[key] && newDropped[key].id === active.id) {
                        newDropped[key] = null;
                    }
                });
                return newDropped;
            });
            return;
        }
    
        if (over.id.startsWith('prompt-')) {
            const destinationPromptId = over.id;
            const occupyingItem = droppedAnswers[destinationPromptId];
    
            setAnswerPool(prevPool => {
                let newPool = [...prevPool];
                newPool = newPool.filter(item => item.id !== active.id);
                if (occupyingItem) {
                    newPool.push(occupyingItem);
                }
                return newPool;
            });
    
            setDroppedAnswers(prevDropped => {
                const newDropped = { ...prevDropped };
                Object.keys(newDropped).forEach(key => {
                    if (newDropped[key] && newDropped[key].id === active.id) {
                        newDropped[key] = null;
                    }
                });
                newDropped[destinationPromptId] = draggedItem;
                return newDropped;
            });
        }
    };

    const handleSubmitExam = () => {
        const currentQuestions = allQuestions[currentDifficulty];
        let correctAnswers = 0;
        const totalMCQs = currentQuestions.mcqs.length;
        const totalMatching = currentQuestions.matching.prompts.length;
        const totalQuestions = totalMCQs + totalMatching;
        const review = { mcqs: [], matching: [] };

        currentQuestions.mcqs.forEach((q, index) => {
            const userAnswer = userMCQAnswers[index];
            const isCorrect = userAnswer === q.answer;
            if (isCorrect) correctAnswers++;
            review.mcqs.push({ question: q.question, userAnswer, correctAnswer: q.answer, isCorrect });
        });

        currentQuestions.matching.prompts.forEach((prompt, index) => {
            const dropId = `prompt-${index}`;
            const userAnswerObj = droppedAnswers[dropId];
            const userAnswer = userAnswerObj ? userAnswerObj.content : null;
            const correctAnswer = currentQuestions.matching.solution[prompt];
            const isCorrect = userAnswer === correctAnswer;
            if (isCorrect) correctAnswers++;
            review.matching.push({ prompt, userAnswer, correctAnswer, isCorrect });
        });
        
        setFinalAnswers(review);
        setScore(correctAnswers);
        setAccuracy(((correctAnswers / totalQuestions) * 100).toFixed(2));
        setCompletionStatus(prev => ({ ...prev, [currentDifficulty]: true }));
        setCurrentView('results');
    };
    
    const startOver = () => {
        setFile(null);
        setSummary('');
        setAllQuestions(null);
        setCurrentView('upload');
        setCurrentDifficulty(null);
        setCompletionStatus({ easy: false, medium: false, hard: false });
        setShowCongrats(false);
        setScore(0);
        setAccuracy(0);
        setShowReview(false);
        setFinalAnswers(null);
        setUserMCQAnswers({});
        setAnswerPool([]);
        setDroppedAnswers({});
    };

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            {showCongrats && <Confetti recycle={false} numberOfPieces={500} width={window.innerWidth} height={window.innerHeight} />}
            <div className="min-h-screen bg-navy-dark font-sans p-4 sm:p-8 text-slate-dark">
            {showReview && <ReviewModal finalAnswers={finalAnswers} onClose={() => setShowReview(false)} />}
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-light mb-2"> AI Pre-Exam Prep ✨ </h1>
                    <p className="text-slate-dark text-lg"> Upload your study material, get a summary, and test your knowledge! </p>
                </header>

                {currentView === 'upload' && (
                    <div className="bg-navy-light p-6 sm:p-8 rounded-2xl shadow-lg border border-navy-lightest">
                        <div className="flex flex-col items-center">
                            <FileUp className="w-16 h-16 text-cyan-glow mb-4" />
                            <h2 className="text-2xl font-bold text-slate-light mb-4">Upload Your Document</h2>
                            <input type="file" id="file-upload" onChange={handleFileChange} className="hidden" accept=".pdf,.docx" />
                            <label htmlFor="file-upload" className="cursor-pointer bg-navy-dark text-slate-light px-4 py-2 rounded-md border border-navy-lightest hover:bg-navy-lightest"> Choose File </label>
                            {file && <p className="mt-4 text-sm text-slate-dark">Selected: {file.name}</p>}
                            <button onClick={handleUpload} disabled={isLoading || !file} className="mt-6 flex items-center justify-center btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                {isLoading ? ( <> <Loader2 className="animate-spin mr-2" /> <span>Processing...</span> </> ) : ( <> <BrainCircuit className="mr-2" /> <span>Generate Quiz</span> </> )}
                            </button>
                            {error && <p className="mt-4 text-pastel-error font-semibold">{error}</p>}
                        </div>
                    </div>
                )}
                
                {currentView === 'summary' && (
                     <div className="bg-navy-light p-8 rounded-2xl shadow-lg border border-navy-lightest animate-fade-in">
                        <h2 className="text-3xl font-bold text-slate-light mb-4 flex items-center"><Sparkles className="mr-2 text-cyan-glow"/> AI Summary</h2>
                        <div className="prose prose-invert max-w-none text-slate-dark whitespace-pre-wrap">{summary}</div>
                        <div className="mt-8 text-center">
                             <button onClick={() => setCurrentView('difficulty')} className="btn-primary"><span>Start Exam!</span></button>
                        </div>
                    </div>
                )}

                {currentView === 'difficulty' && (
                    <div className="bg-navy-light p-8 rounded-2xl shadow-lg border border-navy-lightest animate-fade-in">
                         <button onClick={() => setCurrentView('summary')} className="flex items-center text-cyan-glow mb-6 hover:underline"> <ArrowLeft size={18} className="mr-2"/> Back to Summary </button>
                        <h2 className="text-3xl font-bold text-slate-light mb-6 text-center">Choose Your Difficulty</h2>
                        <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                            {['easy', 'medium', 'hard'].map(level => (
                                <button key={level} onClick={() => startExam(level)} className="btn-primary w-48 flex justify-center items-center capitalize">
                                    <span>{level}</span>
                                    {completionStatus[level] && <Check size={20} className="ml-2 bg-green-500 text-white rounded-full p-1"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {currentView === 'exam' && allQuestions && (
                    <div className="bg-navy-light p-8 rounded-2xl shadow-lg border border-navy-lightest animate-fade-in">
                        <button 
                            onClick={() => setCurrentView('difficulty')} 
                            className="flex items-center text-cyan-glow mb-6 hover:underline"
                        > 
                            <ArrowLeft size={18} className="mr-2"/> Back to Difficulty Selection 
                        </button>
                        
                        <h2 className="text-3xl font-bold text-slate-light mb-6 capitalize">
                            {currentDifficulty} Exam 📝
                        </h2>

                        {/* Multiple Choice Questions Section */}
                        <div>
                            <h3 className="text-2xl font-semibold text-cyan-glow mb-4">Multiple Choice Questions</h3>
                            {allQuestions[currentDifficulty].mcqs.map((q, index) => (
                                <div key={`mcq-${currentDifficulty}-${index}`} className="mb-6 p-4 border-l-4 border-navy-lightest rounded-r-lg bg-navy-dark">
                                    <p className="font-semibold mb-2 text-slate-light">{index + 1}. {q.question}</p>
                                    <div className="space-y-2">
                                        {q.options.map((option) => (
                                            <label key={option} className="flex items-center space-x-2 cursor-pointer group">
                                                <input 
                                                    type="radio" 
                                                    // Unique name per difficulty/question to prevent crosstalk
                                                    name={`mcq-${currentDifficulty}-${index}`} 
                                                    value={option}
                                                    // FIX: This forces the radio to reflect the current state
                                                    checked={userMCQAnswers[index] === option} 
                                                    onChange={() => handleMCQAnswerChange(index, option)} 
                                                    className="form-radio bg-navy-lightest border-slate-dark text-cyan-glow focus:ring-cyan-glow h-4 w-4" 
                                                />
                                                <span className="text-slate-dark group-hover:text-slate-light transition-colors">
                                                    {option}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Match the Following Section */}
                        <div className="mt-8">
                            <h3 className="text-2xl font-semibold text-cyan-glow mb-4">Match the Following</h3>
                            <div className="flex flex-col md:flex-row gap-8">
                                {/* Prompts and Drop Zones */}
                                <div className="flex-1 space-y-3">
                                    {allQuestions[currentDifficulty].matching.prompts.map((prompt, index) => (
                                        <div key={`prompt-container-${index}`} className="flex items-center gap-4">
                                            <div className="flex-1 p-3 bg-navy-dark rounded-md text-slate-light">
                                                {prompt}
                                            </div>
                                            <Droppable id={`prompt-${index}`}>
                                                {droppedAnswers[`prompt-${index}`] ? ( 
                                                    <Draggable 
                                                        id={droppedAnswers[`prompt-${index}`].id} 
                                                        content={<span className="truncate">{droppedAnswers[`prompt-${index}`].content}</span>} 
                                                    /> 
                                                ) : null}
                                            </Droppable>
                                        </div>
                                    ))}
                                </div>

                                {/* Answer Pool */}
                                <div className="w-full md:w-56 p-3 bg-navy-dark rounded-md border-2 border-navy-lightest min-h-[100px]">
                                    <h4 className="text-center font-bold text-slate-light mb-3">Answer Pool</h4>
                                    <div className="space-y-2">
                                        {answerPool.map(answer => (
                                            <Draggable key={answer.id} id={answer.id} content={answer.content} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="mt-8 text-center"> 
                            <button onClick={handleSubmitExam} className="btn-primary">
                                <span>Submit Exam</span>
                            </button> 
                        </div>
                    </div>
                )}
                
                {currentView === 'results' && (
                    <div className="bg-navy-light p-8 rounded-2xl shadow-lg text-center animate-fade-in border border-navy-lightest">
                        <h2 className="text-3xl font-bold text-slate-light mb-4">🎉 Exam Results! 🎉</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8">
                            <StatCard icon={<CheckCircle className="w-10 h-10 text-green-400"/>} label="Total Score" value={`${score} / ${allQuestions[currentDifficulty].mcqs.length + allQuestions[currentDifficulty].matching.prompts.length}`} />
                            <StatCard icon={<Award className="w-10 h-10 text-cyan-glow"/>} label="Accuracy" value={`${accuracy}%`} />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <button onClick={() => setShowReview(true)} className="btn-primary"><Eye className="mr-2"/><span>Review Answers</span></button>
                            <button onClick={() => setCurrentView('difficulty')} className="btn-primary"><span>Choose Another Level</span></button>
                            <button onClick={startOver} className="btn-primary"><span>Upload New Document</span></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </DndContext>
    );
};

export default App;