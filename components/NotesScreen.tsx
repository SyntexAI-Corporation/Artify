
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Search, Globe, FileText, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Note, getNotes, saveNote } from '../services/notesService';

interface NotesScreenProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

export const NotesScreen: React.FC<NotesScreenProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const loadedNotes = await getNotes();
      setNotes(loadedNotes);
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: '',
      timestamp: Date.now(),
    };
    setCurrentNote(newNote);
    setContent('');
  };

  const handleSelectNote = (note: Note) => {
    setCurrentNote(note);
    setContent(note.content);
  };

  const handleBackToNotes = async () => {
    if (currentNote) {
      // Logic: 
      // 1. If content is not empty, save.
      // 2. If content is empty AND it's an existing note (found in list), save as empty.
      // 3. If content is empty AND it's a new note, do nothing (discard).
      
      const isExisting = notes.some(n => n.id === currentNote.id);
      
      if (content.trim()) {
        await saveNote({ ...currentNote, content: content });
      } else if (isExisting) {
        // Save empty note if it already existed
        await saveNote({ ...currentNote, content: content });
      }
      // If new and empty, we just don't save
    }
    setCurrentNote(null);
    await loadNotes();
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-focus on mount if editor
  useEffect(() => {
    if (currentNote && textareaRef.current) {
        textareaRef.current.focus();
    }
  }, [currentNote]);

  // Format date helper
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (currentNote) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <button 
              onClick={handleBackToNotes}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white flex items-center transition-colors group px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 -ml-3"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              {t.back}
            </button>
            
            <div className="flex gap-2"></div>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FileText className="w-40 h-40" />
             </div>
             
             <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.notePlaceholder}
                className="w-full h-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-lg resize-none placeholder-slate-400 dark:placeholder-slate-600 leading-relaxed scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-900 scrollbar-track-transparent"
             />
             
             <div className="text-right text-xs text-slate-500 dark:text-slate-600 mt-2">
                {content.length} chars
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <button 
            onClick={onBack}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center transition-colors group px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 -ml-3 w-fit"
            >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t.back}
            </button>

            <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-slate-700/50"
            >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>
        </div>

        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                        <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                    </span>
                    {t.notes}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">{t.notesDesc}</p>
            </div>
            <button 
                onClick={handleCreateNote}
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95"
            >
                <Plus className="w-6 h-6" />
            </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchNotes}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-slate-900 dark:text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-600"
            />
        </div>

        {/* List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredNotes.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400 dark:text-slate-600">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>{t.noNotes}</p>
                </div>
            ) : (
                filteredNotes.map(note => (
                    <div 
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 relative overflow-hidden"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 pointer-events-none" />
                        
                        <div className="relative z-10">
                            <p className="text-slate-800 dark:text-slate-200 font-medium line-clamp-2 mb-3 min-h-[3rem]">
                                {note.content.trim() || <span className="text-slate-400 dark:text-slate-600 italic">Empty note</span>}
                            </p>
                            <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-3 mt-1">
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                    {formatDate(note.timestamp)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>
    </div>
  );
};
