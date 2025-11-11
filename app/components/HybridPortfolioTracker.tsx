'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, Calculator, Plus, Trash2, Download } from 'lucide-react';

interface PortfolioItem {
  etf: string;
  name: string;
  pct: number;
  current: number;
  price: number;
  targetValue?: number;
  diff?: number;
  action?: string;
  actionType?: 'buy' | 'sell' | 'hold';
  currentPct?: string;
  newValue?: number;
  totalAfter?: number;
  totalAfterUsd?: number;
}

export default function HybridDefensiveGrowthApp() {
  const [usdRate, setUsdRate] = useState<number>(16695.05);
  const [monthlyInvestRp, setMonthlyInvestRp] = useState<number>(1000000);
  const [activeTab, setActiveTab] = useState<string>('allocation');
  const [loadingRate, setLoadingRate] = useState<boolean>(false);
  const [rateSource, setRateSource] = useState<string>('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([
    { etf: 'VYM', name: 'Vanguard High Dividend Yield', pct: 20, current: 0, price: 0 },
    { etf: 'HDV', name: 'iShares Core High Dividend', pct: 15, current: 0, price: 0 },
    { etf: 'SPHD', name: 'Invesco S&P 500 High Div Low Vol', pct: 15, current: 0, price: 0 },
    { etf: 'BND', name: 'Vanguard Total Bond Market', pct: 20, current: 0, price: 0 },
    { etf: 'SPY', name: 'S&P 500', pct: 15, current: 0, price: 0 },
    { etf: 'VTI', name: 'Vanguard Total Stock Market', pct: 10, current: 0, price: 0 },
    { etf: 'SPLV', name: 'Invesco S&P 500 Low Volatility', pct: 5, current: 0, price: 0 },
  ]);

  const formatRupiah = (num: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatUSD = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumberInput = (value: number | string): string => {
    if (!value && value !== 0) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const fetchUSDRate = async (source: string): Promise<void> => {
    setLoadingRate(true);
    setRateSource('');
    
    try {
      let rate: number | null = null;
      let sourceName = '';

      if (source === 'exchangerate') {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        rate = data.rates.IDR;
        sourceName = 'ExchangeRate-API';
      } else if (source === 'fixer') {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        rate = data.rates.IDR;
        sourceName = 'Open Exchange Rates';
      } else if (source === 'freecurrency') {
        const response = await fetch('https://api.freecurrencyapi.com/v1/latest?apikey=fca_live_demo&base_currency=USD&currencies=IDR');
        const data = await response.json();
        rate = data.data.IDR;
        sourceName = 'FreeCurrency API';
      }

      if (rate) {
        setUsdRate(Math.round(rate * 100) / 100);
        setRateSource(`✅ Updated from ${sourceName}`);
        setTimeout(() => setRateSource(''), 3000);
      } else {
        throw new Error('Rate not available');
      }
    } catch (error) {
      console.error('Error fetching USD rate:', error);
      setRateSource('❌ Failed to fetch rate. Please try again.');
      setTimeout(() => setRateSource(''), 3000);
    } finally {
      setLoadingRate(false);
    }
  };

  const totalUsd = monthlyInvestRp / usdRate;
  const totalPct = portfolio.reduce((sum: number, item: PortfolioItem) => sum + item.pct, 0);

  const handleRebalance = () => {
    if (totalPct === 100) return;
    const adjusted = portfolio.map((item: PortfolioItem) => ({
      ...item,
      pct: (item.pct / totalPct) * 100,
    }));
    setPortfolio(adjusted);
  };

  const handleSmartRebalance = () => {
    const totalNow = portfolio.reduce((sum: number, item: PortfolioItem) => sum + (item.current || 0), 0);
    if (totalNow <= 0) {
      alert('⚠️ Masukkan nilai sekarang (Rp) untuk tiap ETF terlebih dahulu.');
      return;
    }

    const adjusted = portfolio.map((item: PortfolioItem) => {
      const targetValue = (item.pct / 100) * totalNow;
      const diff = (item.current || 0) - targetValue;
      let action = 'Seimbang ✅';
      let actionType: 'buy' | 'sell' | 'hold' = 'hold';
      let newValue = item.current;
      let usdDiff = Math.abs(diff) / usdRate;

      if (Math.abs(diff) < 1000) {
        actionType = 'hold';
      } else if (diff > 0) {
        newValue = targetValue;
        action = `Jual ${formatRupiah(diff)} (${formatUSD(usdDiff)})`;
        actionType = 'sell';
      } else if (diff < 0) {
        newValue = targetValue;
        action = `Tambah ${formatRupiah(Math.abs(diff))} (${formatUSD(usdDiff)})`;
        actionType = 'buy';
      }

      return {
        ...item,
        targetValue,
        diff,
        action,
        actionType,
        currentPct: ((item.current / totalNow) * 100).toFixed(2),
        newValue,
      };
    });

    const totalAfter = adjusted.reduce((sum: number, i: PortfolioItem) => sum + (i.newValue || 0), 0);
    const totalAfterUsd = totalAfter / usdRate;

    setPortfolio(adjusted.map((i: PortfolioItem) => ({ ...i, totalAfter, totalAfterUsd })));
  };

  const addETF = () => {
    setPortfolio([...portfolio, { etf: 'NEW', name: 'New ETF', pct: 0, current: 0, price: 0 }]);
  };

  const removeETF = (index: number) => {
    if (portfolio.length <= 1) return;
    const updated = portfolio.filter((_: PortfolioItem, i: number) => i !== index);
    setPortfolio(updated);
  };

  const totalCurrent = portfolio.reduce((sum: number, item: PortfolioItem) => sum + (item.current || 0), 0);
  const totalCurrentUsd = totalCurrent / usdRate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-t-4 border-blue-600">
          <div className="flex items-center gap-3 mb-2">
            <PieChart className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Hybrid Defensive Growth</h1>
          </div>
          <p className="text-gray-600">Portfolio Allocation & Rebalancing Calculator</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100">Total Portfolio</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{formatRupiah(totalCurrent)}</div>
            <div className="text-blue-100 text-sm mt-1">{formatUSD(totalCurrentUsd)}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100">Monthly Investment</span>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{formatRupiah(monthlyInvestRp)}</div>
            <div className="text-green-100 text-sm mt-1">{formatUSD(totalUsd)}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100">USD Exchange Rate</span>
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{formatRupiah(usdRate)}</div>
            <div className="text-purple-100 text-sm mt-1">per USD</div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium text-gray-700 mb-2">Kurs USD (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input
                  type="text"
                  className="border-2 border-gray-300 p-3 pl-10 w-full rounded-lg focus:border-blue-500 focus:outline-none"
                  value={formatNumberInput(usdRate)}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setUsdRate(parseFloat(cleaned) || 0);
                  }}
                  placeholder="0"
                />
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => fetchUSDRate('exchangerate')}
                  disabled={loadingRate}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
                >
                  <Download className="w-4 h-4" />
                  {loadingRate ? 'Loading...' : 'Get Live Rate'}
                </button>
                
                <button
                  onClick={() => fetchUSDRate('fixer')}
                  disabled={loadingRate}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRate ? 'animate-spin' : ''}`} />
                  {loadingRate ? 'Fetching...' : 'Alternative Source'}
                </button>
              </div>
              
              {rateSource && (
                <div className={`mt-2 text-sm ${rateSource.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {rateSource}
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500">
                💡 Klik untuk mengambil kurs real-time dari API
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">Investasi Bulanan (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input
                  type="text"
                  className="border-2 border-gray-300 p-3 pl-10 w-full rounded-lg focus:border-blue-500 focus:outline-none"
                  value={formatNumberInput(monthlyInvestRp)}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setMonthlyInvestRp(parseFloat(cleaned) || 0);
                  }}
                  placeholder="0"
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Setara: <span className="font-semibold text-green-600">{formatUSD(totalUsd)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'allocation'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 Allocation
            </button>
            <button
              onClick={() => setActiveTab('rebalance')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'rebalance'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔄 Rebalance
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'allocation' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Portfolio Allocation</h2>
                  <button
                    onClick={addETF}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add ETF
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200">
                        <th className="p-3 text-left font-semibold text-gray-700">ETF</th>
                        <th className="p-3 text-left font-semibold text-gray-700">Name</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Target %</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Price (USD)</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Budget (Rp)</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Budget (USD)</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Qty to Buy</th>
                        <th className="p-3 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.map((item: PortfolioItem, index: number) => {
                        const investRp = (monthlyInvestRp * item.pct) / 100;
                        const investUsd = investRp / usdRate;
                        const qtyToBuy = item.price > 0 ? (investUsd / item.price) : 0;
                        const totalCost = qtyToBuy * item.price;
                        const remainingUsd = 0;
                        
                        return (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3">
                              <input
                                type="text"
                                className="border p-2 w-20 rounded font-semibold text-blue-600"
                                value={item.etf}
                                onChange={(e) => {
                                  const updated = [...portfolio];
                                  updated[index].etf = e.target.value;
                                  setPortfolio(updated);
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                className="border p-2 w-full rounded text-sm text-gray-600"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...portfolio];
                                  updated[index].name = e.target.value;
                                  setPortfolio(updated);
                                }}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                className="border-2 p-2 w-20 text-right rounded-lg focus:border-blue-500 focus:outline-none"
                                value={item.pct}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const updated = [...portfolio];
                                  updated[index].pct = val;
                                  setPortfolio(updated);
                                }}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="border-2 p-2 pl-5 w-24 text-right rounded-lg focus:border-green-500 focus:outline-none"
                                  value={item.price || ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...portfolio];
                                    updated[index].price = val;
                                    setPortfolio(updated);
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                            </td>
                            <td className="p-3 text-right font-medium text-gray-700">
                              {formatRupiah(investRp)}
                            </td>
                            <td className="p-3 text-right font-medium text-green-600">
                              {formatUSD(investUsd)}
                            </td>
                            <td className="p-3 text-right">
                              {item.price > 0 ? (
                                <div className="text-right">
                                  <div className="font-bold text-blue-600 text-lg">{qtyToBuy}</div>
                                  <div className="text-xs text-gray-500">
                                    Cost: {formatUSD(totalCost)}
                                  </div>
                                  {remainingUsd > 0 && (
                                    <div className="text-xs text-orange-600">
                                      Left: {formatUSD(remainingUsd)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Set price</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => removeETF(index)}
                                className="text-red-500 hover:text-red-700 transition-colors p-2"
                                disabled={portfolio.length <= 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300">
                        <td colSpan={2} className="p-3 text-gray-800">TOTAL</td>
                        <td className={`p-3 text-right ${totalPct === 100 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalPct.toFixed(2)}%
                        </td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right text-gray-800">{formatRupiah(monthlyInvestRp)}</td>
                        <td className="p-3 text-right text-green-600">{formatUSD(totalUsd)}</td>
                        <td className="p-3 text-right text-blue-600 text-lg">
                          {portfolio.reduce((sum: number, item: PortfolioItem) => {
                            const investUsd = (monthlyInvestRp * item.pct) / 100 / usdRate;
                            return sum + (item.price > 0 ? Math.floor(investUsd / item.price) : 0);
                          }, 0)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {totalPct !== 100 && (
                  <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-yellow-800">
                      ⚠️ Total persentase saat ini: <strong>{totalPct.toFixed(2)}%</strong>. 
                      Klik tombol "Auto Rebalance" untuk menyesuaikan ke 100%.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleRebalance}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Auto Rebalance to 100%
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'rebalance' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Smart Rebalance</h2>
                  <button
                    onClick={handleSmartRebalance}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculate Rebalance
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200">
                        <th className="p-3 text-left font-semibold text-gray-700">ETF</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Target %</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Current Value</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Current %</th>
                        <th className="p-3 text-left font-semibold text-gray-700">Action Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.map((item: PortfolioItem, index: number) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-semibold text-blue-600">{item.etf}</div>
                            <div className="text-xs text-gray-500">{item.name}</div>
                          </td>
                          <td className="p-3 text-right font-medium text-gray-700">
                            {item.pct.toFixed(2)}%
                          </td>
                          <td className="p-3 text-right">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                              <input
                                type="text"
                                className="border-2 p-2 pl-8 w-40 text-right rounded-lg focus:border-blue-500 focus:outline-none"
                                placeholder="0"
                                value={item.current ? formatNumberInput(item.current) : ''}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/\D/g, '');
                                  const val = parseFloat(cleaned) || 0;
                                  const updated = [...portfolio];
                                  updated[index].current = val;
                                  setPortfolio(updated);
                                }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-medium ${
                              item.currentPct 
                                ? Math.abs(parseFloat(item.currentPct) - item.pct) > 2 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                                : 'text-gray-400'
                            }`}>
                              {item.currentPct ? `${item.currentPct}%` : '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              item.actionType === 'buy' ? 'bg-green-100 text-green-700' :
                              item.actionType === 'sell' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {item.actionType === 'buy' && <TrendingUp className="w-3 h-3" />}
                              {item.actionType === 'sell' && <TrendingDown className="w-3 h-3" />}
                              {item.action || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {portfolio[0].totalAfter && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">📈 Rebalancing Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 shadow">
                        <div className="text-sm text-gray-600 mb-1">Total Portfolio Value</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatRupiah(portfolio[0].totalAfter || 0)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatUSD(portfolio[0].totalAfterUsd || 0)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow">
                        <div className="text-sm text-gray-600 mb-1">Exchange Rate Used</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatRupiah(usdRate)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">per USD</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Tip:</strong> Masukkan nilai portofolio saat ini untuk setiap ETF, 
                    kemudian klik "Calculate Rebalance" untuk melihat rekomendasi aksi yang diperlukan 
                    agar portofolio kembali seimbang sesuai target alokasi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visual Allocation */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Visual Allocation</h2>
          <div className="space-y-3">
            {portfolio.map((item: PortfolioItem, index: number) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">{item.etf}</span>
                  <span className="text-sm text-gray-600">{item.pct.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${(item.pct / totalPct) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
