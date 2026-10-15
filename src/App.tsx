import React, { useEffect, useMemo, useState } from 'react';
import {
  Wifi,
  Battery,
  Signal,
  Plus,
  Eye,
  EyeOff,
  Snowflake,
  RotateCw,
  Copy,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  Share2,
  Download,
  MonitorDown,
  Sparkles,
  Layers,
  X,
  Lock,
  FileText,
  CheckCircle2,
  ShoppingBag,
  Utensils,
  Plane,
  Zap,
  Briefcase,
  Coffee,
  Globe,
  Pencil,
  RotateCcw,
  UserCheck,
  Database,
  Upload,
  Trash2,
  Calendar,
  Building2,
  CreditCard
} from 'lucide-react';

// ============================================================================
// LOCALSTORAGE KEYS (MULTI-KEY PERSISTENCE ENGINE)
// ============================================================================
const LS_CARDS_KEY = 'wallet_app_cards_v3';
const LS_PASSBOOK_KEY = 'wallet_app_passbook_v3';
const LS_PREFS_KEY = 'wallet_app_prefs_v3';

const LEGACY_CARDS_KEY = 'wallet_app_cards_v2';
const LEGACY_PASSBOOK_KEY = 'wallet_app_passbook_v2';
const LEGACY_PREFS_KEY = 'wallet_app_prefs_v2';

const LEGACY_DUMMY_CARD_IDS = new Set([
  'hdfc-moneyback-debit',
  'sbi-global-debit',
  'swiggy-hdfc-credit',
  'tata-neu-sbi-credit'
]);

const DEFAULT_PREFS = {
  showNumbers: false,
  hideTotalBalance: false,
  sbiVerticalMode: false,
  lastSyncedAt: ''
};

const withoutDummyCards = (cards, passbook) =>
  (Array.isArray(cards) ? cards : [])
    .filter((card) => card && !LEGACY_DUMMY_CARD_IDS.has(card.id))
    .map((card) => ({
      ...card,
      transactions: Array.isArray(passbook?.[card.id])
        ? passbook[card.id]
        : Array.isArray(card.transactions)
          ? card.transactions
          : []
    }));

const readCardBundle = (cardsKey, passbookKey) => {
  const rawCards = window.localStorage.getItem(cardsKey);
  if (!rawCards) return null;
  const parsedCards = JSON.parse(rawCards);
  const rawPassbook = window.localStorage.getItem(passbookKey);
  const parsedPassbook = rawPassbook ? JSON.parse(rawPassbook) : {};
  return withoutDummyCards(parsedCards, parsedPassbook);
};

const persistCardBundle = (cards) => {
  const cardsMetadataOnly = cards.map(({ transactions, ...rest }) => rest);
  const passbookMap = {};
  cards.forEach((card) => {
    passbookMap[card.id] = card.transactions || [];
  });
  window.localStorage.setItem(LS_CARDS_KEY, JSON.stringify(cardsMetadataOnly));
  window.localStorage.setItem(LS_PASSBOOK_KEY, JSON.stringify(passbookMap));
};

const buildInitialCards = () => {
  try {
    const current = readCardBundle(LS_CARDS_KEY, LS_PASSBOOK_KEY);
    if (current) return current;

    const legacy = readCardBundle(LEGACY_CARDS_KEY, LEGACY_PASSBOOK_KEY);
    if (legacy) {
      persistCardBundle(legacy);
      window.localStorage.removeItem(LEGACY_CARDS_KEY);
      window.localStorage.removeItem(LEGACY_PASSBOOK_KEY);
      return legacy;
    }
  } catch (e) {
    // ignore corrupt storage
  }

  return [];
};

const loadInitialPrefs = () => {
  try {
    const raw =
      window.localStorage.getItem(LS_PREFS_KEY) ||
      window.localStorage.getItem(LEGACY_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lastSyncedAt === '15 Oct 2026, 08:10 PM') {
        parsed.lastSyncedAt = '';
      }
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_PREFS;
};

const CATEGORIES = ['All', 'Shopping', 'Dining', 'Salary', 'Travel', 'Bills'];

export default function App() {
  // Persisted Cards & Passbook state
  const [cards, setCards] = useState(buildInitialCards);
  // Persisted User Preferences state
  const [prefs, setPrefs] = useState(loadInitialPrefs);

  const [selectedCardId, setSelectedCardId] = useState(null); // null = 4-Card Stack View
  const [isFlipped, setIsFlipped] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Passbook filter states
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Add Entry Modal
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [newTxForm, setNewTxForm] = useState({
    title: '',
    amount: '',
    type: 'DEBIT',
    category: 'Shopping',
    mode: 'UPI'
  });

  // Edit Card Details Modal State
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [applyNameToAll, setApplyNameToAll] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    name: '',
    bank: '',
    type: 'DEBIT',
    number: '',
    holder: '',
    expiry: '',
    balance: '',
    limit: ''
  });
  const [editCardForm, setEditCardForm] = useState({
    holder: '',
    number: '',
    expiry: '',
    cvv: '',
    ifsc: '',
    accountNumber: '',
    balance: '',
    limit: ''
  });

  // LocalStorage Manager & Settings Modal State
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [storageTab, setStorageTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'JSON' | 'IMPORT'
  const [quickGlobalName, setQuickGlobalName] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Derived convenience flags from prefs
  const showNumbers = prefs.showNumbers;
  const hideTotalBalance = prefs.hideTotalBalance;
  const sbiVerticalMode = prefs.sbiVerticalMode;

  const updatePrefs = (patch) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
        lastSyncedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };
      try {
        window.localStorage.setItem(LS_PREFS_KEY, JSON.stringify(next));
      } catch (e) {
        // ignore storage errors
      }
      return next;
    });
  };

  // Sync both `wallet_app_cards_v2` and `wallet_app_passbook_v2` whenever cards or transactions change
  const updateCardsAndPersist = (updater) => {
    setCards((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        const cardsMetadataOnly = next.map(({ transactions, ...rest }) => rest);
        const passbookMap = {};
        next.forEach((c) => {
          passbookMap[c.id] = c.transactions || [];
        });
        window.localStorage.setItem(
          LS_CARDS_KEY,
          JSON.stringify(cardsMetadataOnly)
        );
        window.localStorage.setItem(
          LS_PASSBOOK_KEY,
          JSON.stringify(passbookMap)
        );
        updatePrefs({});
      } catch (e) {
        // ignore storage errors
      }
      return next;
    });
  };

  const activeCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) || cards[0],
    [cards, selectedCardId]
  );

  // Toast Notification helper
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Format currency in Indian Rupees (₹1,48,520.00)
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Format 16-digit card number into groups of 4 while typing
  const format16DigitsInput = (raw) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 16);
    const groups = digitsOnly.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digitsOnly;
  };

  // Format Card Number masked vs full
  const formatCardNumber = (num, unmask) => {
    if (unmask) return num;
    const parts = (num || '').split(' ');
    return `••••  ••••  ••••  ${parts[parts.length - 1] || '1234'}`;
  };

  // Combined Total Liquidity across all 4 cards (Savings Balances + Available Credit)
  const totalSavingsBalance = useMemo(() => {
    return cards
      .filter((c) => c.type === 'DEBIT')
      .reduce((sum, c) => sum + c.balance, 0);
  }, [cards]);

  const totalAvailableCredit = useMemo(() => {
    return cards
      .filter((c) => c.type === 'CREDIT')
      .reduce((sum, c) => sum + (c.available || 0), 0);
  }, [cards]);

  const handleCardSelect = (id) => {
    setSelectedCardId(id);
    setIsFlipped(false);
    setTxTypeFilter('ALL');
    setCategoryFilter('All');
    setSearchQuery('');
  };

  const handleBackToStack = () => {
    setSelectedCardId(null);
    setIsFlipped(false);
  };

  const handleAddCardSubmit = (e) => {
    e.preventDefault();
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const balance = Math.max(0, Number(newCardForm.balance) || 0);
    const limit = Math.max(0, Number(newCardForm.limit) || 0);
    const card = {
      id,
      designKey: 'CUSTOM',
      name: newCardForm.name.trim(),
      bank: newCardForm.bank.trim(),
      type: newCardForm.type,
      network: 'Card',
      number: format16DigitsInput(newCardForm.number),
      holder: newCardForm.holder.trim().toUpperCase(),
      expiry: newCardForm.expiry.trim(),
      cvv: '',
      balance,
      limit,
      ...(newCardForm.type === 'CREDIT' ? { available: Math.max(0, limit - balance) } : {}),
      spentThisMonth: 0,
      rewardPoints: 'No rewards added',
      ifsc: '',
      branch: '',
      accountNumber: '',
      upiId: '',
      helpline: '',
      frozen: false,
      gradient: 'from-[#1d4ed8] via-[#0f766e] to-[#111827]',
      accentColor: '#38bdf8',
      glowClass: 'shadow-cyan-500/20',
      transactions: []
    };
    updateCardsAndPersist((previous) => [...previous, card]);
    setNewCardForm({
      name: '',
      bank: '',
      type: 'DEBIT',
      number: '',
      holder: '',
      expiry: '',
      balance: '',
      limit: ''
    });
    setIsAddCardOpen(false);
    handleCardSelect(id);
    triggerToast(`${card.name} added to wallet`);
  };

  const toggleFreezeCard = () => {
    if (!activeCard) return;
    updateCardsAndPersist((prev) =>
      prev.map((c) => {
        if (c.id === activeCard.id) {
          const nextState = !c.frozen;
          triggerToast(
            nextState
              ? `${c.name} frozen & saved to localStorage`
              : `${c.name} unlocked & active`
          );
          return { ...c, frozen: nextState };
        }
        return c;
      })
    );
  };

  const handleCopy = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    triggerToast(`${label} copied to clipboard`);
  };

  // Open Edit Modal for a specific card
  const openEditCardModal = (cardToEdit, e = undefined) => {
    if (e) e.stopPropagation();
    const target = cardToEdit || activeCard || cards[0];
    setEditingCardId(target.id);
    setApplyNameToAll(false);
    setEditCardForm({
      holder: target.holder,
      number: target.number,
      expiry: target.expiry,
      cvv: target.cvv,
      ifsc: target.ifsc,
      accountNumber: target.accountNumber,
      balance: String(target.balance),
      limit: String(target.limit)
    });
    setIsEditCardOpen(true);
  };

  // Save Edited Card Details
  const handleSaveCardEdit = (e) => {
    e.preventDefault();
    const cleanHolder = (editCardForm.holder || 'CARD HOLDER').toUpperCase().trim();
    const formattedNumber =
      editCardForm.number.replace(/\D/g, '').length >= 4
        ? format16DigitsInput(editCardForm.number)
        : editCardForm.number.trim();
    const nextBalance = Math.max(0, parseFloat(editCardForm.balance) || 0);
    const nextLimit = Math.max(0, parseFloat(editCardForm.limit) || 100000);

    updateCardsAndPersist((prev) =>
      prev.map((c) => {
        if (c.id === editingCardId) {
          const updatedAvailable =
            c.type === 'CREDIT' ? Math.max(0, nextLimit - nextBalance) : undefined;
          return {
            ...c,
            holder: cleanHolder,
            number: formattedNumber,
            expiry: editCardForm.expiry.trim() || c.expiry,
            cvv: editCardForm.cvv.trim().slice(0, 4) || c.cvv,
            ifsc: editCardForm.ifsc.toUpperCase().trim() || c.ifsc,
            accountNumber: editCardForm.accountNumber.trim() || c.accountNumber,
            balance: nextBalance,
            limit: nextLimit,
            ...(c.type === 'CREDIT' ? { available: updatedAvailable } : {})
          };
        }
        if (applyNameToAll) {
          return {
            ...c,
            holder: cleanHolder
          };
        }
        return c;
      })
    );

    setIsEditCardOpen(false);
    triggerToast(
      applyNameToAll
        ? `Saved "${cleanHolder}" across all cards in localStorage!`
        : 'Card details updated & synced to localStorage!'
    );
  };

  // Apply a single Cardholder Name across all 4 cards from LocalStorage Manager
  const handleQuickGlobalNameSave = (e) => {
    e.preventDefault();
    if (!quickGlobalName.trim()) return;
    const cleanName = quickGlobalName.toUpperCase().trim();
    updateCardsAndPersist((prev) =>
      prev.map((c) => ({
        ...c,
        holder: cleanName
      }))
    );
    setQuickGlobalName('');
    setIsStorageModalOpen(false);
    triggerToast(`Cardholder name "${cleanName}" applied to all cards`);
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstallEvent(null);
  };

  const handleClearWallet = () => {
    try {
      window.localStorage.removeItem(LS_CARDS_KEY);
      window.localStorage.removeItem(LS_PASSBOOK_KEY);
      window.localStorage.removeItem(LS_PREFS_KEY);
      window.localStorage.removeItem(LEGACY_CARDS_KEY);
      window.localStorage.removeItem(LEGACY_PASSBOOK_KEY);
      window.localStorage.removeItem(LEGACY_PREFS_KEY);
    } catch (e) {
      // ignore
    }
    setCards([]);
    setPrefs(DEFAULT_PREFS);
    setSelectedCardId(null);
    setIsStorageModalOpen(false);
    triggerToast('Cleared wallet data from this browser');
  };

  // Live JSON snapshot of all 3 localStorage keys for the Inspector & Backup
  const liveStorageBundle = useMemo(() => {
    const cardsMetadataOnly = cards.map(({ transactions, ...rest }) => rest);
    const passbookMap = {};
    cards.forEach((c) => {
      passbookMap[c.id] = c.transactions || [];
    });
    return {
      [LS_CARDS_KEY]: cardsMetadataOnly,
      [LS_PASSBOOK_KEY]: passbookMap,
      [LS_PREFS_KEY]: prefs
    };
  }, [cards, prefs]);

  // Export LocalStorage JSON file
  const handleDownloadBackupJson = () => {
    const jsonString = JSON.stringify(liveStorageBundle, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'indian_card_wallet_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Exported localStorage backup JSON');
  };

  // Import JSON backup into LocalStorage
  const handleImportJsonSubmit = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJsonText);
      const importedCards = parsed[LS_CARDS_KEY] || parsed[LEGACY_CARDS_KEY];
      const importedPassbook =
        parsed[LS_PASSBOOK_KEY] || parsed[LEGACY_PASSBOOK_KEY] || {};
      const importedPrefs = parsed[LS_PREFS_KEY] || parsed[LEGACY_PREFS_KEY] || DEFAULT_PREFS;

      if (!Array.isArray(importedCards)) {
        triggerToast(`Invalid JSON format: missing ${LS_CARDS_KEY} array`);
        return;
      }

      const merged = withoutDummyCards(importedCards, importedPassbook);
      if (merged.length === 0) {
        triggerToast('Import has no cards.');
        return;
      }

      updateCardsAndPersist(merged);
      updatePrefs(importedPrefs);
      setImportJsonText('');
      setStorageTab('OVERVIEW');
      triggerToast('Successfully imported & synced wallet JSON to localStorage!');
    } catch (err) {
      triggerToast('Failed to parse JSON. Please check syntax.');
    }
  };

  // Delete a specific Passbook Transaction & recalculate balance
  const handleDeleteTransaction = (txToDelete) => {
    if (!activeCard || !txToDelete) return;
    updateCardsAndPersist((prev) =>
      prev.map((c) => {
        if (c.id !== activeCard.id) return c;
        const remainingTx = c.transactions.filter((t) => t.id !== txToDelete.id);
        if (c.type === 'DEBIT') {
          const restoredBal =
            txToDelete.type === 'DEBIT'
              ? c.balance + txToDelete.amount
              : Math.max(0, c.balance - txToDelete.amount);
          return {
            ...c,
            balance: restoredBal,
            transactions: remainingTx
          };
        } else {
          const restoredUsed =
            txToDelete.type === 'DEBIT'
              ? Math.max(0, c.balance - txToDelete.amount)
              : c.balance + txToDelete.amount;
          return {
            ...c,
            balance: restoredUsed,
            available: Math.max(0, c.limit - restoredUsed),
            transactions: remainingTx
          };
        }
      })
    );
    setActiveReceipt(null);
    triggerToast(`Deleted entry ${txToDelete.id} from localStorage`);
  };

  // Filtered Passbook Transactions
  const filteredTransactions = useMemo(() => {
    if (!activeCard) return [];
    return activeCard.transactions.filter((tx) => {
      const matchesType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;
      const matchesCat =
        categoryFilter === 'All' || tx.category === categoryFilter;
      const matchesSearch =
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.mode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesCat && matchesSearch;
    });
  }, [activeCard, txTypeFilter, categoryFilter, searchQuery]);

  // Passbook Summary Metrics
  const passbookMetrics = useMemo(() => {
    if (!activeCard) return { totalCredit: 0, totalDebit: 0, closingBalance: 0 };
    const totalCredit = activeCard.transactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = activeCard.transactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0);
    const closingBalance =
      activeCard.type === 'DEBIT' ? activeCard.balance : activeCard.available;
    return { totalCredit, totalDebit, closingBalance };
  }, [activeCard]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Shopping':
        return <ShoppingBag className="w-4 h-4" />;
      case 'Dining':
        return <Utensils className="w-4 h-4" />;
      case 'Travel':
        return <Plane className="w-4 h-4" />;
      case 'Bills':
        return <Zap className="w-4 h-4" />;
      case 'Salary':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Coffee className="w-4 h-4" />;
    }
  };

  // Add New Passbook Entry Handler
  const handleAddTxSubmit = (e) => {
    e.preventDefault();
    if (!activeCard) return;

    if (activeCard.frozen && newTxForm.type === 'DEBIT') {
      triggerToast(`${activeCard.name} is frozen! Unfreeze card to debit.`);
      return;
    }

    const amt = parseFloat(newTxForm.amount);
    if (!amt || amt <= 0) return;

    const currentRunBal =
      activeCard.type === 'DEBIT' ? activeCard.balance : activeCard.available;
    const updatedRunBal =
      newTxForm.type === 'CREDIT'
        ? currentRunBal + amt
        : Math.max(0, currentRunBal - amt);

    const newTx = {
      id: `UTR${Math.floor(100000000000 + Math.random() * 899999999999)}`,
      title: newTxForm.title.trim() || 'Merchant POS / UPI Entry',
      category: newTxForm.category,
      date: '15 Oct 2026, Just Now',
      mode: newTxForm.mode,
      type: newTxForm.type,
      amount: amt,
      runningBalance: updatedRunBal,
      status: newTxForm.type === 'CREDIT' ? 'Completed' : 'Settled',
      merchantLocation: 'Ahmedabad, GJ / Verified Terminal',
      notes: `Recorded in ${activeCard.name} Passbook`
    };

    updateCardsAndPersist((prev) =>
      prev.map((c) => {
        if (c.id !== activeCard.id) return c;
        if (c.type === 'DEBIT') {
          return {
            ...c,
            balance: updatedRunBal,
            spentThisMonth:
              newTxForm.type === 'DEBIT'
                ? (c.spentThisMonth || 0) + amt
                : c.spentThisMonth,
            transactions: [newTx, ...c.transactions]
          };
        } else {
          const newUsed =
            newTxForm.type === 'DEBIT'
              ? c.balance + amt
              : Math.max(0, c.balance - amt);
          return {
            ...c,
            balance: newUsed,
            available: Math.max(0, c.limit - newUsed),
            transactions: [newTx, ...c.transactions]
          };
        }
      })
    );

    setIsAddTxOpen(false);
    setNewTxForm({
      title: '',
      amount: '',
      type: 'DEBIT',
      category: 'Shopping',
      mode: 'UPI'
    });
    triggerToast(
      `${newTx.type === 'CREDIT' ? 'CR (+)' : 'DR (-)'} ${formatINR(amt)} saved to Passbook`
    );
  };

  // ============================================================================
  // BESPOKE REALISTIC CARD FACE RENDERER (4 AUTHENTIC INDIAN CARDS)
  // ============================================================================
  const renderAuthenticCardFace = (card) => {
    const displayNum = formatCardNumber(card.number, showNumbers);

    // --------------------------------------------------------------------------
    // 1. HDFC BANK MONEYBACK DEBIT CARD (Metallic Blue + @ Shopping Cart)
    // --------------------------------------------------------------------------
    if (card.designKey === 'HDFC_MONEYBACK') {
      return (
        <div className="relative w-full h-full rounded-[24px] p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#6998ce] via-[#3c6ea6] to-[#173963] border border-blue-200/30 shadow-[0_14px_35px_rgba(12,35,68,0.75)] text-white select-none">
          <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-white/15 blur-2xl pointer-events-none" />

          {/* Center Watermark: Shopping Cart with '@' Symbol */}
          <svg
            viewBox="0 0 220 140"
            className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-36 opacity-25 pointer-events-none"
            fill="none"
          >
            <rect x="65" y="42" width="48" height="7" rx="2" fill="#0B2545" />
            <rect x="65" y="58" width="42" height="7" rx="2" fill="#0B2545" />
            <rect x="65" y="74" width="36" height="7" rx="2" fill="#0B2545" />
            <path
              d="M175 26H145L118 92H62"
              stroke="#0B2545"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="72" cy="112" r="11" fill="#0B2545" />
            <circle cx="115" cy="112" r="11" fill="#0B2545" />
            <circle cx="48" cy="60" r="24" fill="#133B6E" />
            <text
              x="48"
              y="69"
              textAnchor="middle"
              fill="#6998ce"
              fontSize="28"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              @
            </text>
          </svg>

          {/* Top Header: MoneyBack DEBIT & Official HDFC BANK Logo */}
          <div className="flex items-start justify-between relative z-10">
            <div className="leading-none">
              <h3 className="text-lg font-extrabold tracking-tight text-white drop-shadow-sm">
                MoneyBack
              </h3>
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-100 block text-right mr-0.5 mt-0.5">
                DEBIT
              </span>
            </div>

            <div className="flex items-center bg-[#142952] border border-white/80 rounded-[3px] overflow-hidden shadow-sm">
              <div className="w-5 h-5 bg-[#E31837] flex items-center justify-center relative p-0.5">
                <div className="w-3 h-3 border-[2px] border-white flex items-center justify-center">
                  <div className="w-1 h-1 bg-white" />
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
                HDFC BANK
              </span>
            </div>
          </div>

          {/* Middle Row: Gold EMV Chip + Contactless Wave */}
          <div className="flex items-center justify-between my-1 relative z-10">
            <div className="w-11 h-8 rounded-[6px] bg-gradient-to-br from-[#f6e094] via-[#d8b453] to-[#b1862a] border border-amber-900/40 relative overflow-hidden shadow-inner">
              <div className="absolute inset-x-0 top-1/3 h-[1px] bg-amber-950/35" />
              <div className="absolute inset-x-0 bottom-1/3 h-[1px] bg-amber-950/35" />
              <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-950/35" />
              <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-950/35" />
              <div className="absolute inset-[7px] rounded-[3px] border border-amber-950/30" />
            </div>

            <Wifi className="w-5 h-5 text-white/90 rotate-90" />
          </div>

          {/* Silver Embossed Card Number + MONTH/YEAR VALID THRU + Holder + VISA Platinum */}
          <div className="space-y-1 relative z-10">
            <div className="font-mono text-[16px] sm:text-[18px] font-bold tracking-[0.16em] text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]">
              {displayNum}
            </div>

            <div className="flex items-end justify-between pt-0.5">
              <div className="space-y-0.5">
                <div className="ml-14">
                  <span className="text-[6px] uppercase tracking-widest text-blue-100/80 block mb-0.5">
                    MONTH/YEAR
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] uppercase leading-[8px] text-blue-100/80 font-semibold">
                      VALID
                      <br />
                      THRU
                    </span>
                    <span className="font-mono text-xs font-bold tracking-wider text-slate-100 drop-shadow">
                      {card.expiry}
                    </span>
                  </div>
                </div>
                <p className="font-mono text-[11px] sm:text-xs font-bold tracking-[0.14em] text-slate-100 uppercase drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
                  {card.holder}
                </p>
              </div>

              <div className="text-right leading-none">
                <span className="italic font-black tracking-tighter text-xl text-white drop-shadow block">
                  VISA
                </span>
                <span className="text-[9px] font-medium tracking-wide text-blue-100/90">
                  Platinum
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 2. SBI GLOBAL INTERNATIONAL DEBIT CARD (Matte Black + Blue Globe + RuPay)
    // --------------------------------------------------------------------------
    if (card.designKey === 'SBI_GLOBAL') {
      return (
        <div className="relative w-full h-full rounded-[24px] p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1d222b] via-[#11151c] to-[#080a0f] border border-cyan-400/25 shadow-[0_14px_35px_rgba(0,0,0,0.85)] text-white select-none">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-400/20 rotate-12 scale-x-125" />
              <div className="absolute inset-2 rounded-full border border-dashed border-sky-400/25 -rotate-12 scale-y-90" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1 left-8 shadow-[0_0_8px_#22d3ee]" />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-300 absolute bottom-3 right-6" />
              <div className="w-2 h-2 rounded-full bg-cyan-300 absolute top-1/2 -right-2" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#072a4f] via-[#0c5696] to-[#38bdf8]/70 opacity-55 shadow-[0_0_30px_rgba(14,165,233,0.45)] flex items-center justify-center overflow-hidden">
                <Globe className="w-20 h-20 text-cyan-200/50 stroke-[1.2]" />
              </div>
            </div>
          </div>

          {/* Top Row: International Debit Card + 75 Azadi Ka Amrit Mahotsav + GLOBAL */}
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-[10px] font-medium text-slate-300 tracking-wide block">
                International Debit Card
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-light tracking-[0.22em] text-slate-100 uppercase">
                  GLOBAL
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] text-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="ml-0.5 font-semibold">
                    75 Azadi Ka Amrit Mahotsav
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-[#00A9E0] flex items-center justify-center relative">
                <div className="w-2 h-2 rounded-full bg-[#0d1117]" />
                <div className="w-1 h-2.5 bg-[#0d1117] absolute bottom-0" />
              </div>
              <span className="text-base font-black tracking-tight text-white">
                SBI
              </span>
            </div>
          </div>

          {/* Middle Row: Gold EMV Chip + Contactless Wave */}
          <div className="flex items-center justify-between my-1 relative z-10">
            <div className="w-10 h-7 rounded-[6px] bg-gradient-to-br from-[#f6e094] via-[#d8b453] to-[#b1862a] border border-amber-900/40 relative overflow-hidden shadow-inner">
              <div className="absolute inset-x-0 top-1/3 h-[1px] bg-amber-950/35" />
              <div className="absolute inset-x-0 bottom-1/3 h-[1px] bg-amber-950/35" />
              <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-950/35" />
              <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-950/35" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1">
                <span className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-orange-500" />
                <span className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-emerald-500" />
              </div>
              <Wifi className="w-5 h-5 text-white rotate-90" />
            </div>
          </div>

          {/* Bottom Section: Card Number, Valid Thru, Holder & RuPay DEBIT */}
          <div className="space-y-1.5 relative z-10">
            <div className="font-mono text-[16px] sm:text-[18px] font-semibold tracking-[0.16em] text-cyan-50 drop-shadow">
              {displayNum}
            </div>

            <div className="flex items-end justify-between pt-0.5">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[7px] uppercase leading-[8px] text-slate-400">
                    VALID
                    <br />
                    THRU
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {card.expiry}
                  </span>
                </div>
                <p className="font-mono text-xs font-bold tracking-[0.15em] text-white uppercase">
                  {card.holder}
                </p>
              </div>

              <div className="text-right leading-none">
                <div className="flex items-center justify-end">
                  <span className="italic font-black tracking-tighter text-lg text-white">
                    RuPay
                  </span>
                  <div className="flex -space-x-1 ml-0.5">
                    <span className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-orange-500" />
                    <span className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-emerald-500" />
                  </div>
                </div>
                <span className="text-[9px] font-semibold tracking-[0.2em] text-slate-300 uppercase block mt-0.5">
                  DEBIT
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 3. SWIGGY HDFC BANK CREDIT CARD (Vibrant Orange-Magenta + 10% Cashback)
    // --------------------------------------------------------------------------
    if (card.designKey === 'SWIGGY_HDFC') {
      return (
        <div className="relative w-full h-full rounded-[24px] p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#FF5200] via-[#D91B5C] to-[#260836] border border-orange-300/35 shadow-[0_14px_35px_rgba(255,82,0,0.35)] text-white select-none">
          <div className="absolute -right-8 -bottom-10 w-44 h-44 rounded-full bg-orange-400/20 blur-xl pointer-events-none" />
          <div className="absolute right-5 top-12 px-2.5 py-0.5 rounded-full bg-black/30 border border-white/15 backdrop-blur-md text-[10px] font-extrabold text-amber-200 tracking-wide">
            10% CASHBACK
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white text-[#FF5200] flex items-center justify-center font-black text-lg shadow-md">
                S
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white">
                    SWIGGY
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20 text-white">
                    CREDIT
                  </span>
                </div>
                <span className="text-[10px] text-orange-100/85 font-medium block">
                  SWIGGY | HDFC BANK
                </span>
              </div>
            </div>

            <div className="flex items-center bg-[#142952]/90 border border-white/60 rounded-[3px] overflow-hidden">
              <div className="w-4 h-4 bg-[#E31837] flex items-center justify-center">
                <div className="w-2 h-2 border border-white" />
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white">
                HDFC BANK
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between my-1 relative z-10">
            <div className="w-10 h-7 rounded-[6px] bg-gradient-to-br from-[#f6e094] via-[#d8b453] to-[#b1862a] border border-amber-900/40 shadow-inner" />
            <Wifi className="w-5 h-5 text-white/90 rotate-90" />
          </div>

          <div className="space-y-1.5 relative z-10">
            <div className="font-mono text-[16px] sm:text-[18px] font-bold tracking-[0.16em] text-white drop-shadow">
              {displayNum}
            </div>

            <div className="flex items-end justify-between pt-0.5">
              <div>
                <span className="text-[8px] uppercase tracking-widest text-orange-100/80 block">
                  VALID THRU {card.expiry}
                </span>
                <span className="font-mono text-xs font-bold text-white uppercase">
                  {card.holder}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#EB001B]/95" />
                  <div className="w-6 h-6 rounded-full bg-[#F79E1B]/95 -ml-2.5" />
                </div>
                <span className="text-[8px] uppercase tracking-widest text-white/80 mt-0.5">
                  Mastercard World
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (card.designKey === 'CUSTOM') {
      return (
        <div
          className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[24px] border border-white/20 p-5 text-white shadow-2xl select-none"
          style={{ background: `linear-gradient(135deg, ${card.accentColor} 0%, #0f172a 82%)` }}
        >
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">{card.name}</p>
              <p className="mt-0.5 truncate text-xs text-white/70">{card.bank}</p>
            </div>
            <span className="shrink-0 rounded border border-white/20 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase">
              {card.type}
            </span>
          </div>
          <div className="relative z-10">
            <div className="mb-3 flex h-7 w-10 items-center justify-center rounded-md border border-amber-200/40 bg-gradient-to-br from-amber-100 to-amber-500">
              <span className="h-4 w-6 rounded border border-amber-900/40" />
            </div>
            <p className="font-mono text-base font-semibold tracking-[0.14em] sm:text-lg">
              {displayNum}
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-white/60">{card.expiry}</p>
                <p className="truncate font-mono text-xs font-bold">{card.holder}</p>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">{card.network}</span>
            </div>
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 4. TATA NEU INFINITY SBI CREDIT CARD (Cosmic Violet + NeuCoins + SBI Card)
    // --------------------------------------------------------------------------
    return (
      <div className="relative w-full h-full rounded-[24px] p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2E1A5E] via-[#1C0B3B] to-[#140D2B] border border-purple-400/35 shadow-[0_14px_35px_rgba(88,28,135,0.5)] text-white select-none">
        <div className="absolute -top-12 right-8 w-44 h-44 rounded-full bg-gradient-to-tr from-fuchsia-500/25 via-purple-400/20 to-cyan-400/20 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold tracking-widest uppercase text-white/90">
                TATA
              </span>
              <span className="text-base font-black tracking-tight bg-gradient-to-r from-fuchsia-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent">
                neu
              </span>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/25 border border-purple-400/40 text-purple-200 ml-1">
                INFINITY
              </span>
            </div>
            <span className="text-[10px] text-purple-200/75 font-medium block mt-0.5">
              {card.rewardPoints}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/15">
            <div className="w-4 h-4 rounded-full bg-[#00A9E0] flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C0B3B]" />
              <div className="w-0.5 h-1.5 bg-[#1C0B3B] absolute bottom-0" />
            </div>
            <span className="text-[11px] font-extrabold tracking-tight text-white">
              SBI Card
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between my-1 relative z-10">
          <div className="w-10 h-7 rounded-[6px] bg-gradient-to-br from-[#f6e094] via-[#d8b453] to-[#b1862a] border border-amber-900/40 shadow-inner" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              UPI Enabled
            </span>
            <Wifi className="w-5 h-5 text-white/90 rotate-90" />
          </div>
        </div>

        <div className="space-y-1.5 relative z-10">
          <div className="font-mono text-[16px] sm:text-[18px] font-bold tracking-[0.16em] text-purple-50 drop-shadow">
            {displayNum}
          </div>

          <div className="flex items-end justify-between pt-0.5">
            <div>
              <span className="text-[8px] uppercase tracking-widest text-purple-200/75 block">
                VALID THRU {card.expiry}
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase">
                {card.holder}
              </span>
            </div>

            <div className="text-right leading-none">
              <span className="italic font-black tracking-tighter text-base text-white block">
                RuPay
              </span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-amber-300">
                SELECT
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#080b10] text-slate-100 font-sans relative overflow-x-hidden">
      <main className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-[88%] bg-slate-900/95 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-medium backdrop-blur-xl animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        <header className="flex items-center justify-between gap-4 border-b border-white/10 py-5 sm:py-6">
          {selectedCardId ? (
            <button
              onClick={handleBackToStack}
              className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span>All cards</span>
            </button>
          ) : (
            <h1 className="text-xl font-extrabold tracking-tight text-white">Wallet</h1>
          )}

          <div className="flex items-center gap-2">
            {installEvent && (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <MonitorDown className="h-4 w-4" /> Install
              </button>
            )}
            {selectedCardId && (
              <button
                onClick={() => updatePrefs({ showNumbers: !showNumbers })}
                title={showNumbers ? 'Mask card numbers' : 'Show card numbers'}
                className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            {!selectedCardId && (
              <button
                onClick={() => setIsAddCardOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3.5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                <Plus className="h-4 w-4" /> Add card
              </button>
            )}
          </div>
        </header>

        <div className="space-y-6 py-6">
          {/* =========================================================
              MODE 1: STACKED 4-CARD WALLET VIEW
             ========================================================= */}
          {!selectedCardId && (
            <div className="space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Your cards</h2>
                  <p className="mt-1 text-sm text-slate-400">{cards.length} cards</p>
                </div>
              </div>

              {cards.length === 0 ? (
                <div className="mx-auto flex min-h-[280px] w-full max-w-[520px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] px-6 text-center">
                  <p className="text-base font-semibold text-white">No cards yet</p>
                  <p className="mt-2 text-sm text-slate-400">Add a card to start a passbook.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddCardOpen(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3.5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    <Plus className="h-4 w-4" /> Add card
                  </button>
                </div>
              ) : (
              <div
                className="relative mx-auto w-full max-w-[520px]"
                style={{ height: `${Math.max(212, (cards.length - 1) * 68 + 212)}px` }}
              >
                {cards.map((card, index) => {
                  const offsetY = index * 68;
                  const scale = Math.max(0.84, 1 - (cards.length - 1 - index) * 0.02);
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleCardSelect(card.id)}
                      style={{
                        transform: `translateY(${offsetY}px) scale(${scale})`,
                        zIndex: index + 1
                      }}
                      className="group absolute top-0 left-0 right-0 h-[212px] cursor-pointer transition-all duration-300 ease-out hover:brightness-110"
                    >
                      {card.frozen && (
                        <div className="absolute inset-0 rounded-[24px] bg-slate-950/70 backdrop-blur-[3px] z-30 flex items-center justify-center">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-300/40 text-cyan-200 text-xs font-bold">
                            <Snowflake className="w-4 h-4 animate-spin" />
                            CARD FROZEN
                          </div>
                        </div>
                      )}
                      {renderAuthenticCardFace(card)}
                    </div>
                  );
                })}
              </div>
              )}

            </div>
          )}

          {/* =========================================================
              MODE 2: ACTIVE CARD DETAILS + INDIAN PASSBOOK LEDGER
             ========================================================= */}
          {selectedCardId && activeCard && (
            <div className="pt-2 space-y-5 animate-fadeIn">
              {/* Quick 4-Card Switcher Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {cards.map((c) => {
                  const isCurrent = c.id === activeCard.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleCardSelect(c.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-white text-slate-950 border-white shadow-md'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.accentColor }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* ACTIVE HERO CARD (Front Authentic UI or Flipped Back with CVV/IFSC) */}
              <div className="relative">
                {!isFlipped ? (
                  <div
                    className={`relative ${
                      activeCard.designKey === 'SBI_GLOBAL' && sbiVerticalMode
                        ? 'h-[340px] w-[235px] mx-auto'
                        : 'h-[222px] w-full'
                    } transition-all duration-300`}
                  >
                    {activeCard.frozen && (
                      <div className="absolute inset-0 rounded-[24px] bg-slate-950/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-2">
                        <Snowflake className="w-7 h-7 text-cyan-300 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                          Card Temporarily Frozen
                        </p>
                        <button
                          onClick={toggleFreezeCard}
                          className="text-[11px] font-bold px-3 py-1 rounded-full bg-white text-slate-900"
                        >
                          Tap to Unfreeze
                        </button>
                      </div>
                    )}

                    {/* Vertical Portrait Orientation Option for SBI Global Card */}
                    {activeCard.designKey === 'SBI_GLOBAL' && sbiVerticalMode ? (
                      <div className="relative w-full h-full rounded-[24px] p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1d222b] via-[#11151c] to-[#080a0f] border border-cyan-400/30 shadow-2xl text-white">
                        <div className="flex items-start justify-between">
                          <span className="text-[9px] text-slate-300 font-medium">
                            International Debit Card
                          </span>
                          <div className="text-right leading-none">
                            <span className="text-[8px] text-amber-300 font-bold block">
                              75 Azadi Ka
                            </span>
                            <span className="text-[8px] text-emerald-300">
                              Amrit Mahotsav
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between my-1">
                          <div className="w-10 h-8 rounded-[6px] bg-gradient-to-br from-[#f6e094] via-[#d8b453] to-[#b1862a] border border-amber-900/40" />
                          <span className="text-sm font-light tracking-[0.25em] uppercase text-white">
                            GLOBAL
                          </span>
                        </div>

                        <div className="my-auto mx-auto w-28 h-28 rounded-full bg-gradient-to-tr from-[#072a4f] via-[#0c5696] to-[#38bdf8]/75 opacity-80 flex items-center justify-center border border-cyan-300/30 shadow-[0_0_25px_rgba(14,165,233,0.4)]">
                          <Globe className="w-20 h-20 text-cyan-100/70 stroke-[1.2]" />
                        </div>

                        <div className="space-y-1.5 relative z-10">
                          <p className="font-mono text-xs font-bold tracking-widest text-cyan-100">
                            {formatCardNumber(activeCard.number, showNumbers)}
                          </p>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-white">
                              {activeCard.holder}
                            </span>
                            <span className="font-mono text-cyan-300">
                              {activeCard.expiry}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="italic font-black text-sm text-white">
                              RuPay DEBIT
                            </span>
                            <span className="font-black text-sm text-[#00A9E0]">
                              SBI
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      renderAuthenticCardFace(activeCard)
                    )}
                  </div>
                ) : (
                  /* BACK OF ACTIVE CARD (Magnetic Stripe, CVV, IFSC, Helpline) */
                  <div
                    className={`relative h-[222px] rounded-[24px] bg-gradient-to-bl ${activeCard.gradient} border border-white/25 shadow-2xl flex flex-col justify-between overflow-hidden py-4`}
                  >
                    <div className="w-full h-10 bg-neutral-950/95 border-y border-white/10" />

                    <div className="px-5 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-9 rounded-lg bg-white/95 px-3 flex items-center justify-between text-slate-900">
                          <span className="font-serif italic text-xs text-slate-700">
                            {activeCard.holder}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Authorized Sign
                          </span>
                        </div>
                        {activeCard.cvv ? (
                          <button
                            onClick={() => handleCopy(activeCard.cvv, 'CVV')}
                            className="px-3 h-9 rounded-lg bg-black/60 border border-white/25 text-white font-mono text-xs font-bold flex items-center gap-1.5"
                          >
                            <span>CVV {showNumbers ? activeCard.cvv : '•••'}</span>
                            <Copy className="w-3 h-3 text-cyan-300" />
                          </button>
                        ) : (
                          <span className="flex h-9 items-center rounded-lg border border-white/15 bg-black/40 px-3 text-xs text-white/60">
                            CVV not added
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-black/40 backdrop-blur-md p-2.5 rounded-xl border border-white/15 text-[11px]">
                        <div>
                          <span className="text-white/55 block text-[9px] uppercase">
                            Account / Card Ref
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {activeCard.accountNumber || 'Not added'}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/55 block text-[9px] uppercase">
                            Bank IFSC Code
                          </span>
                          <span className="font-mono font-semibold text-cyan-200">
                            {activeCard.ifsc || 'Not added'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 flex items-center justify-between text-[10px] text-white/80">
                      <span>Helpline: {activeCard.helpline}</span>
                      <span className="font-mono">{activeCard.upiId}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 1-Tap Portrait Orientation Toggle for SBI Global Card */}
              {activeCard.designKey === 'SBI_GLOBAL' && !isFlipped && (
                <div className="flex justify-center">
                  <button
                    onClick={() =>
                      updatePrefs({ sbiVerticalMode: !sbiVerticalMode })
                    }
                    className="text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 px-3 py-1 rounded-full hover:bg-cyan-500/20 transition"
                  >
                    {sbiVerticalMode
                      ? 'Switch to Horizontal Wallet View'
                      : 'View Vertical Portrait Layout (Like Physical Card)'}
                  </button>
                </div>
              )}

              {/* INTERACTIVE CARD ACTION BAR (5 Buttons including Edit Card) */}
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  onClick={() => openEditCardModal(activeCard)}
                  className="p-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 flex flex-col items-center gap-1 text-[10px] font-bold text-cyan-200 transition"
                >
                  <Pencil className="w-4 h-4 text-cyan-300" />
                  <span>Edit Card</span>
                </button>

                <button
                  onClick={() => handleCopy(activeCard.number, 'Card Number')}
                  className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex flex-col items-center gap-1 text-[10px] font-semibold text-slate-200 transition"
                >
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copy No.</span>
                </button>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[10px] font-semibold transition ${
                    isFlipped
                      ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  <span>{isFlipped ? 'Front UI' : 'Flip CVV'}</span>
                </button>

                <button
                  onClick={toggleFreezeCard}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[10px] font-semibold transition ${
                    activeCard.frozen
                      ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-200'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  {activeCard.frozen ? (
                    <Lock className="w-4 h-4 text-cyan-300" />
                  ) : (
                    <Snowflake className="w-4 h-4 text-slate-300" />
                  )}
                  <span>{activeCard.frozen ? 'Unfreeze' : 'Freeze'}</span>
                </button>

                <button
                  onClick={() => setIsAddTxOpen(true)}
                  className="p-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 flex flex-col items-center gap-1 text-[10px] font-semibold text-emerald-200 transition"
                >
                  <Plus className="w-4 h-4 text-emerald-300" />
                  <span>Add Entry</span>
                </button>
              </div>

              {/* DETAILED CREDIT vs DEBIT ACCOUNT & PASSBOOK SUMMARY CARD */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          activeCard.type === 'CREDIT'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        }`}
                      >
                        {activeCard.type} CARD
                      </span>
                      {activeCard.ifsc && (
                        <span className="text-xs font-bold text-slate-300 font-mono">
                          IFSC: {activeCard.ifsc}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-xs font-semibold text-slate-400">
                        Holder:{' '}
                        <span className="text-white font-mono">
                          {activeCard.holder}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">
                      {activeCard.type === 'DEBIT'
                        ? 'Savings A/C Balance'
                        : 'Available Credit Limit'}
                    </span>
                    <span className="text-base font-black text-white">
                      {formatINR(
                        activeCard.type === 'DEBIT'
                          ? activeCard.balance
                          : activeCard.available
                      )}
                    </span>
                  </div>
                </div>

                {/* Specialized Metadata Grid: CREDIT vs DEBIT */}
                {activeCard.type === 'CREDIT' ? (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-[10px]">
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Total Limit</span>
                      <span className="font-bold text-white">
                        {formatINR(activeCard.limit)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Used / Unbilled</span>
                      <span className="font-bold text-amber-300">
                        {formatINR(activeCard.balance)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Min Due & Cycle</span>
                      <span className="font-bold text-rose-300">
                        {activeCard.minDue ? formatINR(activeCard.minDue) : 'Not set'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-[10px]">
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Linked A/C No.</span>
                      <span className="font-mono font-bold text-white truncate block">
                        {activeCard.accountNumber}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">ATM / POS Limit</span>
                      <span className="font-bold text-cyan-300">
                        {formatINR(activeCard.limit)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Home Branch</span>
                      <span className="font-bold text-slate-200 truncate block">
                        {activeCard.branch || 'Ahmedabad Main'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Utilization / Limit Progress Bar */}
                {(() => {
                  const usedAmount =
                    activeCard.type === 'CREDIT'
                      ? activeCard.balance
                      : activeCard.spentThisMonth || 0;
                  const maxAmount = activeCard.limit || 100000;
                  const pct = Math.min(
                    100,
                    Math.round((usedAmount / maxAmount) * 100)
                  );
                  return (
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: activeCard.accentColor
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {activeCard.type === 'CREDIT'
                            ? `Cycle: ${activeCard.billingCycle || 'Not set'} (${pct}% Used)`
                            : `Monthly POS/ATM Spend: ${formatINR(usedAmount)} (${pct}%)`}
                        </span>
                        <span className="text-slate-200 font-semibold">
                          {activeCard.rewardPoints}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* =========================================================
                  INDIAN BANK PASSBOOK LEDGER (DR / CR & RUNNING BALANCE)
                 ========================================================= */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-extrabold tracking-tight text-white">
                      Passbook Ledger ({activeCard.bank})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {filteredTransactions.length} entries
                  </span>
                </div>

                {/* Passbook Summary Strip (Total Inflow, Total Outflow, Closing Bal) */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                    <span className="text-[9px] font-bold uppercase text-emerald-300 block">
                      Credits (Cr +)
                    </span>
                    <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block">
                      +{formatINR(passbookMetrics.totalCredit)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/20">
                    <span className="text-[9px] font-bold uppercase text-rose-300 block">
                      Debits (Dr -)
                    </span>
                    <span className="text-xs font-extrabold text-rose-400 mt-0.5 block">
                      -{formatINR(passbookMetrics.totalDebit)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Closing Bal
                    </span>
                    <span className="text-xs font-extrabold text-white mt-0.5 block">
                      {formatINR(passbookMetrics.closingBalance)}
                    </span>
                  </div>
                </div>

                {/* Filter Tabs: All Entries | Debits (Dr) | Credits (Cr) */}
                <div className="grid grid-cols-3 gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-bold">
                  {[
                    { key: 'ALL', label: 'All Entries' },
                    { key: 'DEBIT', label: 'Debits (Dr)' },
                    { key: 'CREDIT', label: 'Credits (Cr)' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setTxTypeFilter(tab.key)}
                      className={`py-1.5 rounded-lg transition ${
                        txTypeFilter === tab.key
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Input & Category Pills */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search merchant, UTR/RRN ref, or mode..."
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          categoryFilter === cat
                            ? 'bg-white/15 border-cyan-400/50 text-cyan-200'
                            : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction Ledger Rows */}
                <div className="space-y-2">
                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-300">
                        No matching passbook entries
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Try clearing filters or tap &ldquo;Add Entry&rdquo; above.
                      </p>
                    </div>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() =>
                          setActiveReceipt({ ...tx, card: activeCard })
                        }
                        className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              tx.type === 'CREDIT'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {getCategoryIcon(tx.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition truncate">
                              {tx.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-300 font-medium">
                                {tx.mode}
                              </span>
                              <span>•</span>
                              <span className="truncate">{tx.date}</span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                              Ref: {tx.id}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-0.5">
                            {tx.type === 'CREDIT' ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            <span
                              className={`text-xs font-extrabold ${
                                tx.type === 'CREDIT'
                                  ? 'text-emerald-400'
                                  : 'text-white'
                              }`}
                            >
                              {tx.type === 'CREDIT' ? '+' : '-'}
                              {formatINR(tx.amount)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-300/90 block mt-0.5">
                            Bal: {formatINR(tx.runningBalance)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {isAddCardOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <form
              onSubmit={handleAddCardSubmit}
              className="w-full max-w-md space-y-4 rounded-2xl border border-white/15 bg-[#111820] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Add card</h2>
                  <p className="mt-1 text-xs text-amber-300">Demo only. Do not enter real card details.</p>
                </div>
                <button type="button" onClick={() => setIsAddCardOpen(false)} title="Close" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 space-y-1 text-xs text-slate-300">
                  Card name
                  <input required maxLength={32} value={newCardForm.name} onChange={(e) => setNewCardForm({ ...newCardForm, name: e.target.value })} placeholder="Everyday card" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  Bank
                  <input required maxLength={32} value={newCardForm.bank} onChange={(e) => setNewCardForm({ ...newCardForm, bank: e.target.value })} placeholder="Your bank" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  Type
                  <select value={newCardForm.type} onChange={(e) => setNewCardForm({ ...newCardForm, type: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#151b23] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400">
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </label>
                <label className="col-span-2 space-y-1 text-xs text-slate-300">
                  Card number
                  <input required inputMode="numeric" maxLength={19} value={newCardForm.number} onChange={(e) => setNewCardForm({ ...newCardForm, number: format16DigitsInput(e.target.value) })} placeholder="0000 0000 0000 0000" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  Cardholder
                  <input required maxLength={32} value={newCardForm.holder} onChange={(e) => setNewCardForm({ ...newCardForm, holder: e.target.value })} placeholder="NAME" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  Expiry
                  <input required maxLength={5} value={newCardForm.expiry} onChange={(e) => setNewCardForm({ ...newCardForm, expiry: e.target.value })} placeholder="MM/YY" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  {newCardForm.type === 'DEBIT' ? 'Balance' : 'Used credit'}
                  <input type="number" min="0" step="0.01" value={newCardForm.balance} onChange={(e) => setNewCardForm({ ...newCardForm, balance: e.target.value })} placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  {newCardForm.type === 'DEBIT' ? 'Daily limit' : 'Credit limit'}
                  <input type="number" min="0" step="0.01" value={newCardForm.limit} onChange={(e) => setNewCardForm({ ...newCardForm, limit: e.target.value })} placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" />
                </label>
              </div>

              <button type="submit" className="w-full rounded-lg bg-cyan-400 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">
                Add to wallet
              </button>
            </form>
          </div>
        )}

        {/* =========================================================
            MODAL 1: EDIT CARD DETAILS (NAME, NUMBER, EXPIRY, CVV, BALANCE)
           ========================================================= */}
        {isEditCardOpen && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3 animate-fadeIn">
            <form
              onSubmit={handleSaveCardEdit}
              className="w-full bg-[#111625] border border-white/15 rounded-[28px] p-5 space-y-3.5 shadow-2xl max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Edit Card Details
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auto-saves to window.localStorage
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditCardOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Card Selector inside Edit Modal */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Select Card to Edit
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {cards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openEditCardModal(c)}
                      className={`px-2.5 py-2 rounded-xl text-left text-[11px] font-semibold border transition truncate ${
                        editingCardId === c.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Cardholder Name + Apply to All Cards Toggle */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ALEX SHARMA"
                      value={editCardForm.holder}
                      onChange={(e) =>
                        setEditCardForm({
                          ...editCardForm,
                          holder: e.target.value.toUpperCase()
                        })
                      }
                      className="w-full bg-black/40 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono uppercase text-xs outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                    <input
                      type="checkbox"
                      checked={applyNameToAll}
                      onChange={(e) => setApplyNameToAll(e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-400"
                    />
                    <span className="text-[11px] text-cyan-300 font-semibold">
                      Apply this Cardholder Name to all cards
                    </span>
                  </label>
                </div>

                {/* 16-Digit Card Number */}
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    16-Digit Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4191 0000 0000 1234"
                    value={editCardForm.number}
                    onChange={(e) =>
                      setEditCardForm({
                        ...editCardForm,
                        number: format16DigitsInput(e.target.value)
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono text-xs tracking-wider outline-none"
                  />
                </div>

                {/* Expiry Date & CVV */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      Valid Thru (MM/YY)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="06/31"
                      value={editCardForm.expiry}
                      onChange={(e) =>
                        setEditCardForm({ ...editCardForm, expiry: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      CVV (3 Digits)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={editCardForm.cvv}
                      onChange={(e) =>
                        setEditCardForm({
                          ...editCardForm,
                          cvv: e.target.value.replace(/\D/g, '')
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Bank Account / Ref & IFSC */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      A/C or Card Ref No.
                    </label>
                    <input
                      type="text"
                      value={editCardForm.accountNumber}
                      onChange={(e) =>
                        setEditCardForm({
                          ...editCardForm,
                          accountNumber: e.target.value
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      value={editCardForm.ifsc}
                      onChange={(e) =>
                        setEditCardForm({
                          ...editCardForm,
                          ifsc: e.target.value.toUpperCase()
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono uppercase text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Balance & Limit */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      Balance / Used (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCardForm.balance}
                      onChange={(e) =>
                        setEditCardForm({ ...editCardForm, balance: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      Total Limit (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCardForm.limit}
                      onChange={(e) =>
                        setEditCardForm({ ...editCardForm, limit: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditCardOpen(false)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-xs font-extrabold text-white shadow-lg transition"
                >
                  Save to LocalStorage
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================
            MODAL 2: LOCALSTORAGE INSPECTOR, JSON BACKUP/IMPORT & RESET
           ========================================================= */}
        {isStorageModalOpen && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3 animate-fadeIn">
            <div className="w-full bg-[#111625] border border-white/15 rounded-[28px] p-5 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      LocalStorage Manager
                    </h3>
                    <p className="text-[11px] text-emerald-400 font-medium">
                      Synced • {prefs.lastSyncedAt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsStorageModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-navigation tabs inside LocalStorage Manager */}
              <div className="grid grid-cols-3 gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStorageTab('OVERVIEW')}
                  className={`py-1.5 rounded-lg transition ${
                    storageTab === 'OVERVIEW'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Controls & Keys
                </button>
                <button
                  type="button"
                  onClick={() => setStorageTab('JSON')}
                  className={`py-1.5 rounded-lg transition ${
                    storageTab === 'JSON'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inspect Live JSON
                </button>
                <button
                  type="button"
                  onClick={() => setStorageTab('IMPORT')}
                  className={`py-1.5 rounded-lg transition ${
                    storageTab === 'IMPORT'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Import / Restore
                </button>
              </div>

              {storageTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Active LocalStorage Keys Status */}
                  <div className="p-3 rounded-2xl bg-black/35 border border-white/10 space-y-2 text-[11px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Active window.localStorage Keys
                    </span>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-cyan-300">{LS_CARDS_KEY}</span>
                      <span className="text-emerald-400">{cards.length} Cards Saved</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-purple-300">{LS_PASSBOOK_KEY}</span>
                      <span className="text-emerald-400">
                        {cards.reduce(
                          (acc, c) => acc + (c.transactions?.length || 0),
                          0
                        )}{' '}
                        Entries
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-amber-300">{LS_PREFS_KEY}</span>
                      <span className="text-emerald-400">Active</span>
                    </div>
                  </div>

                  {/* Bulk Rename All 4 Cards */}
                  <form onSubmit={handleQuickGlobalNameSave} className="space-y-2">
                    <label className="text-xs font-bold text-slate-200 block">
                      Apply Cardholder Name to All Cards
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Enter name (e.g. ALEX SHARMA)"
                        value={quickGlobalName}
                        onChange={(e) =>
                          setQuickGlobalName(e.target.value.toUpperCase())
                        }
                        className="flex-1 bg-white/5 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition shrink-0"
                      >
                        Save All
                      </button>
                    </div>
                  </form>

                  {/* Export Backup JSON & Copy JSON */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBackupJson}
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-4 h-4 text-cyan-300" />
                      <span>Export JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(liveStorageBundle, null, 2),
                          'LocalStorage JSON'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
                    >
                      <Copy className="w-4 h-4 text-emerald-300" />
                      <span>Copy JSON</span>
                    </button>
                  </div>

                  {/* Reset to Default Safe Dummy Data */}
                  <button
                    type="button"
                    onClick={handleClearWallet}
                    className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Clear wallet data</span>
                  </button>
                </div>
              )}

              {storageTab === 'JSON' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Live JSON stored in browser `localStorage`:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(liveStorageBundle, null, 2),
                          'Raw LocalStorage JSON'
                        )
                      }
                      className="text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy All
                    </button>
                  </div>
                  <pre className="w-full h-60 overflow-auto rounded-2xl bg-black/70 border border-white/10 p-3 text-[10px] font-mono text-emerald-300 select-all">
                    {JSON.stringify(liveStorageBundle, null, 2)}
                  </pre>
                </div>
              )}

              {storageTab === 'IMPORT' && (
                <form onSubmit={handleImportJsonSubmit} className="space-y-3">
                  <p className="text-[11px] text-slate-400">
                    Paste previously exported wallet JSON below to restore your
                    cards, custom names, and passbook ledger directly into{' '}
                    <code className="text-cyan-300">localStorage</code>.
                  </p>
                  <textarea
                    rows={6}
                    required
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='{"wallet_app_cards_v3": [...], "wallet_app_passbook_v3": {...}}'
                    className="w-full rounded-2xl bg-black/60 border border-white/15 focus:border-emerald-400 p-3 text-[11px] font-mono text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import & Sync to LocalStorage</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL 3: PASSBOOK UTR/RRN TRANSACTION RECEIPT SHEET
           ========================================================= */}
        {activeReceipt && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex items-end justify-center p-3 animate-fadeIn">
            <div className="w-full bg-[#121726] border border-white/15 rounded-[30px] p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                      activeReceipt.type === 'CREDIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {activeReceipt.type === 'CREDIT' ? 'CR (+)' : 'DR (-)'} Passbook Entry
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeReceipt.id}
                  </span>
                </div>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center py-1 space-y-1">
                <p className="text-xs text-slate-300 font-semibold">
                  {activeReceipt.title}
                </p>
                <h4
                  className={`text-2xl font-black ${
                    activeReceipt.type === 'CREDIT'
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {activeReceipt.type === 'CREDIT' ? '+' : '-'}
                  {formatINR(activeReceipt.amount)}
                </h4>
                <p className="text-[11px] text-emerald-300 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {activeReceipt.status}
                </p>
              </div>

              <div className="bg-black/35 rounded-2xl p-3.5 space-y-2 text-xs border border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">Card / Bank</span>
                  <span className="font-bold text-white">
                    {activeReceipt.card.name} ({activeReceipt.card.type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cardholder</span>
                  <span className="font-mono text-slate-200">
                    {activeReceipt.card.holder}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Running Balance After</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {formatINR(activeReceipt.runningBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode</span>
                  <span className="font-medium text-slate-200">
                    {activeReceipt.mode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="font-medium text-slate-200">
                    {activeReceipt.date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Passbook Narration</span>
                  <span className="font-medium text-slate-300 text-right max-w-[60%]">
                    {activeReceipt.notes}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDeleteTransaction(activeReceipt)}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center justify-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button
                  onClick={() => {
                    triggerToast(`Passbook advice ${activeReceipt.id} saved`);
                    setActiveReceipt(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => {
                    handleCopy(
                      `${activeReceipt.title} | ${activeReceipt.type} ${formatINR(
                        activeReceipt.amount
                      )} | Ref: ${activeReceipt.id}`,
                      'Passbook Receipt'
                    );
                    setActiveReceipt(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white flex items-center justify-center gap-1 transition"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL 4: LOG NEW PASSBOOK ENTRY (INR ₹)
           ========================================================= */}
        {isAddTxOpen && activeCard && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-end sm:items-center justify-center p-3">
            <form
              onSubmit={handleAddTxSubmit}
              className="w-full bg-[#121726] border border-white/15 rounded-[30px] p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Add Passbook Entry (₹)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeCard.name} • Auto-syncs to localStorage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewTxForm({ ...newTxForm, type: 'DEBIT' })
                    }
                    className={`py-2 rounded-xl font-bold border transition ${
                      newTxForm.type === 'DEBIT'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    DEBIT (DR -)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewTxForm({ ...newTxForm, type: 'CREDIT' })
                    }
                    className={`py-2 rounded-xl font-bold border transition ${
                      newTxForm.type === 'CREDIT'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    CREDIT (CR +)
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Merchant / Passbook Narration
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swiggy Instamart / Croma / NEFT Inward"
                    value={newTxForm.title}
                    onChange={(e) =>
                      setNewTxForm({ ...newTxForm, title: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Amount (₹ INR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="1500"
                      value={newTxForm.amount}
                      onChange={(e) =>
                        setNewTxForm({ ...newTxForm, amount: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={newTxForm.mode}
                      onChange={(e) =>
                        setNewTxForm({ ...newTxForm, mode: e.target.value })
                      }
                      className="w-full bg-[#1A2035] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="UPI">UPI</option>
                      <option value="POS Tap">POS Tap</option>
                      <option value="Online">Online</option>
                      <option value="IMPS/NEFT">IMPS/NEFT</option>
                      <option value="Auto-Debit">Auto-Debit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={newTxForm.category}
                    onChange={(e) =>
                      setNewTxForm({ ...newTxForm, category: e.target.value })
                    }
                    className="w-full bg-[#1A2035] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="Shopping">Shopping</option>
                    <option value="Dining">Dining</option>
                    <option value="Salary">Salary / Inward CR</option>
                    <option value="Travel">Travel / Fuel</option>
                    <option value="Bills">Bills & Utilities</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-xs font-extrabold text-slate-950 transition"
              >
                Save Entry to Passbook & LocalStorage
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}