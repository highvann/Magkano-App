import { useState, useEffect, useRef } from 'react';
import './Analytics.css';

function Analytics({ setActiveTab }) {
  const [expenses, setExpenses] = useState([]);
  const [timeRange, setTimeRange] = useState('1M'); 
  
  const [activeBento, setActiveBento] = useState(null); 
  const [activePoint, setActivePoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredCat, setHoveredCat] = useState(null);
  
  const graphRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5000/expenses');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    let pastDate = new Date();

    switch(timeRange) {
      case '1W': pastDate.setDate(now.getDate() - 7); break;
      case '1M': pastDate.setMonth(now.getMonth() - 1); break;
      case '3M': pastDate.setMonth(now.getMonth() - 3); break;
      case '6M': pastDate.setMonth(now.getMonth() - 6); break;
      case '1Y': pastDate.setFullYear(now.getFullYear() - 1); break;
      default: pastDate.setMonth(now.getMonth() - 1);
    }

    return expenses.filter(exp => new Date(exp.date) >= pastDate);
  };

  const filteredExpenses = getFilteredData();

  const generateGraphData = () => {
    const dailyData = {};
    filteredExpenses.forEach(exp => {
      const d = new Date(exp.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const localDateStr = `${yyyy}-${mm}-${dd}`;
      
      if (!dailyData[localDateStr]) dailyData[localDateStr] = { amount: 0, transactions: [] };
      
      dailyData[localDateStr].amount += Number(exp.amount);
      dailyData[localDateStr].transactions.push(exp);
    });

    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    if (sortedDates.length === 0) return { points: [], max: 100 };

    const dataPoints = sortedDates.map(date => ({
      date,
      displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      shortDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: dailyData[date].amount,
      transactions: dailyData[date].transactions
    }));

    const maxAmount = Math.max(...dataPoints.map(d => d.amount), 100);
    return { points: dataPoints, max: maxAmount * 1.35 }; 
  };

  const { points: graphPoints, max: graphMax } = generateGraphData();
  const peakPoint = graphPoints.reduce((max, p) => (p.amount > max.amount ? p : max), graphPoints[0] || { amount: 0, displayDate: 'N/A' });

  const createSmoothPath = (points, width, height) => {
    if (points.length === 0) return { linePath: "", areaPath: "", coords: [] };
    if (points.length === 1) {
      const y = height - (points[0].amount / graphMax) * height;
      return { 
        linePath: `M 0,${y} L ${width},${y}`, 
        areaPath: `M 0,${y} L ${width},${y} L ${width},${height} L 0,${height} Z`,
        coords: [{x: width/2, y}]
      };
    }

    const coords = points.map((p, i) => ({
      x: (i / (points.length - 1)) * width,
      y: height - (p.amount / graphMax) * height
    }));

    let linePath = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX = (curr.x + next.x) / 2;
      linePath += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
    }

    const areaPath = `${linePath} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;
    return { linePath, areaPath, coords };
  };

  const generatePieData = () => {
    const categoryTotals = {};
    let totalOutflow = 0;

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount);
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
      totalOutflow += amt;
    });

    const categories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalOutflow > 0 ? (amount / totalOutflow) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { categories, totalOutflow };
  };

  const { categories: pieData, totalOutflow } = generatePieData();
  
  const getDaysInRange = () => {
    switch(timeRange) {
      case '1W': return 7; case '1M': return 30; case '3M': return 90; case '6M': return 180; case '1Y': return 365; default: return 30;
    }
  };
  const dailyAvg = totalOutflow / getDaysInRange();

  const topCategory = pieData.length > 0 ? pieData[0] : null;
  const largestTx = filteredExpenses.reduce((max, exp) => (Number(exp.amount) > (Number(max?.amount) || 0) ? exp : max), null);

  const recurringTxs = expenses.filter(exp => exp.isrecurring === true || String(exp.isRecurring) === 'true');
  const totalRecurring = recurringTxs.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const topRecurring = [...recurringTxs].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 4);

  const colors = ['#818cf8', '#6366f1', '#a78bfa', '#38bdf8', '#60a5fa'];
  const shadowColors = ['#089868', '#037a54', '#025a3d', '#034532', '#011c14'];

  const IconArrowLeft = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
  const IconExpand = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>;
  const IconRepeat = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;

  const handleTransactionClick = (tx) => {
    const isRecurring = tx.isrecurring === true || String(tx.isrecurring) === 'true' || tx.isRecurring === true || String(tx.isRecurring) === 'true';
    if (isRecurring) {
      sessionStorage.setItem('openSubscriptionId', tx.id);
      if (setActiveTab) setActiveTab('subscriptions');
    } else {
      sessionStorage.setItem('openTxId', tx.id);
      if (setActiveTab) setActiveTab('history');
    }
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describePieSlice = (x, y, radius, startAngle, endAngle) => {
    if (endAngle - startAngle >= 359.99) {
      return `M ${x} ${y - radius} A ${radius} ${radius} 0 1 1 ${x} ${y + radius} A ${radius} ${radius} 0 1 1 ${x} ${y - radius} Z`;
    }
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const renderPieScene = (isExpanded = false) => {
    let currentAngle = 0;
    const cx = 500, cy = 500;
    const radius = isExpanded ? 400 : 380;

    let mappedSlices = pieData.map((cat, i) => {
        const sliceAngle = (cat.percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        const midAngle = startAngle + (sliceAngle / 2);
        currentAngle = endAngle;

        const path = describePieSlice(cx, cy, radius, startAngle, endAngle);
        
        const staggerFactor = (i % 2 === 0) ? 1.35 : 1.65;
        
        const lineStart = polarToCartesian(cx, cy, radius * 0.95, midAngle);
        const lineEnd = polarToCartesian(cx, cy, radius * staggerFactor, midAngle);
        const textPos = polarToCartesian(cx, cy, radius * (staggerFactor + 0.15), midAngle); 
        
        return { ...cat, path, lineStart, lineEnd, textPos, midAngle, startAngle, endAngle, originalIndex: i };
    });

    mappedSlices.sort((a, b) => {
        const distA = Math.abs(180 - a.midAngle);
        const distB = Math.abs(180 - b.midAngle);
        return distB - distA; 
    });

    const depthLayers = Array.from({ length: 30 }, (_, i) => i * 3).reverse();

    return (
      <div className={`svg-pie-container ${isExpanded ? 'expanded-pie' : ''}`}>
          <svg viewBox="0 0 1200 1200" className="svg-pie-iso">
              <g transform="scale(1, 0.55) translate(100, 450)">
                  {mappedSlices.map((slice, idx) => {
                      const baseColor = colors[slice.originalIndex % colors.length];
                      const darkColor = shadowColors[slice.originalIndex % shadowColors.length];
                      const isHovered = hoveredCat === slice.name;
                      const isDimmed = hoveredCat !== null && !isHovered;

                      return (
                          <g 
                              key={slice.name} 
                              className={`pie-slice-group ${isHovered ? 'hovered' : ''} ${isDimmed ? 'dimmed' : ''}`}
                              style={{ '--delay': `${idx * 0.25}s` }}
                              onMouseEnter={() => setHoveredCat(slice.name)}
                              onMouseLeave={() => setHoveredCat(null)}
                          >
                              {depthLayers.map(z => (
                                  <path 
                                      key={z} 
                                      d={slice.path} 
                                      fill={z === 0 ? baseColor : darkColor} 
                                      stroke={z === 0 ? baseColor : darkColor}
                                      strokeWidth="2" 
                                      strokeLinejoin="round"
                                      transform={`translate(0, ${z})`}
                                  />
                              ))}
                              
                              {slice.percentage > 0 && (
                                <polyline 
                                  points={`${slice.lineStart.x},${slice.lineStart.y} ${slice.lineEnd.x},${slice.lineEnd.y}`} 
                                  stroke={baseColor} 
                                  strokeWidth="3" 
                                  fill="none"
                                  opacity="0.9"
                                />
                              )}

                              {slice.percentage > 0 && (
                                <text 
                                    x={slice.textPos.x} 
                                    y={slice.textPos.y} 
                                    fill="#ffffff" 
                                    fontSize={isExpanded ? "64" : "72"}
                                    fontFamily="'Segoe UI', system-ui, sans-serif"
                                    fontWeight="900" 
                                    textAnchor="middle" 
                                    dominantBaseline="central"
                                    style={{ 
                                      transformOrigin: `${slice.textPos.x}px ${slice.textPos.y}px`,
                                      transform: 'scaleY(1.818)' 
                                    }} 
                                    filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.8))"
                                >
                                    {slice.percentage.toFixed(0)}%
                                </text>
                              )}
                          </g>
                      );
                  })}
              </g>
          </svg>
          <div className="pie-floor-shadow"></div>
      </div>
    );
  };

  const displayPoint = hoveredPoint || activePoint;

  return (
    <div className="wf-analytics-canvas" onClick={() => { setActivePoint(null); setHoveredPoint(null); setHoveredCat(null); }}>
      
      <div className="analytics-header mb-large flex-between">
        <button className="btn-back-ghost" onClick={(e) => { 
          e.stopPropagation(); 
          if(activeBento) { setActiveBento(null); setActivePoint(null); setHoveredPoint(null); setHoveredCat(null); }
          else if(setActiveTab) { setActiveTab('dashboard'); }
        }}>
          <IconArrowLeft /> {activeBento ? 'Back to Overview' : 'Back to Summary'}
        </button>

        <div className="time-range-selector">
          {['1W', '1M', '3M', '6M', '1Y'].map(range => (
            <button 
              key={range} 
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => { setTimeRange(range); setActivePoint(null); setHoveredPoint(null); }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {activeBento === null ? (
        
        <div className="bento-dashboard-grid">
          
          <div className="dash-matte-card p-normal bento-span-1 bento-stat-card glow-panel">
            <p className="dash-sm-label text-muted">TOTAL OUTFLOW</p>
            <h2 className="dash-md-amount text-primary mt-xs">₱{totalOutflow.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
          </div>
          
          <div className="dash-matte-card p-normal bento-span-1 bento-stat-card glow-panel">
            <p className="dash-sm-label text-muted">DAILY AVERAGE</p>
            <h2 className="dash-md-amount text-white mt-xs">₱{dailyAvg.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
          </div>

          <div className="dash-matte-card p-normal bento-span-1 bento-stat-card glow-panel">
            <p className="dash-sm-label text-muted">TOP CATEGORY</p>
            <h2 className="dash-md-amount text-white mt-xs truncate-text" title={topCategory?.name}>{topCategory ? topCategory.name : 'N/A'}</h2>
          </div>

          <div className="dash-matte-card p-normal bento-span-1 bento-stat-card glow-panel">
            <p className="dash-sm-label text-muted">LARGEST TX</p>
            <h2 className="dash-md-amount text-white mt-xs truncate-text" title={largestTx?.description}>{largestTx ? largestTx.description : 'N/A'}</h2>
          </div>

          <div className="dash-matte-card split-horizon bento-span-3 bento-interactive glow-panel" onClick={() => setActiveBento('trend')}>
            <div className="split-horizon-header flex-between custom-header-pad">
              <div>
                <h3 className="card-title text-white">Outflow Trend Overview</h3>
              </div>
              <span className="icon-xs text-muted"><IconExpand /></span>
            </div>
            
            <div className="split-horizon-content relative trend-preview-content">
               {graphPoints.length === 0 ? (
                 <div className="empty-graph-state">No trend data available.</div>
               ) : (
                 <svg viewBox="0 0 1000 240" preserveAspectRatio="none" className="analytics-svg full-size">
                    <defs>
                       <linearGradient id="areaGlowMini" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                         <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                       </linearGradient>
                       <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                         <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="var(--accent-primary)" floodOpacity="1" />
                       </filter>
                    </defs>

                    <line x1="0" y1="40" x2="1000" y2="40" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                    <text x="0" y="30" className="chart-axis-text">PEAK (₱{peakPoint.amount.toLocaleString(undefined, {maximumFractionDigits:0})})</text>
                    
                    <line x1="0" y1="110" x2="1000" y2="110" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                    <text x="0" y="100" className="chart-axis-text">AVG</text>
                    
                    <line x1="0" y1="180" x2="1000" y2="180" stroke="var(--border-light)" strokeWidth="2" opacity="0.8" />
                    <text x="0" y="170" className="chart-axis-text">BASE</text>
                    
                    {(() => {
                       const { linePath, areaPath, coords } = createSmoothPath(graphPoints, 1000, 180);
                       return (
                         <>
                           <path d={areaPath} fill="url(#areaGlowMini)" className="graph-area-path-mini" />
                           
                           {coords.map((coord, i) => (
                             <line key={`vg-${i}`} x1={coord.x} y1={coord.y} x2={coord.x} y2="180" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
                           ))}

                           <path d={linePath} fill="none" className="graph-stroke-path-mini" pathLength="1000" />
                           
                           {coords.map((coord, i) => {
                             if (graphPoints[i].amount === peakPoint.amount && peakPoint.amount > 0) {
                               return <circle key={i} cx={coord.x} cy={coord.y} r="5" fill="var(--theme-bg)" stroke="var(--accent-primary)" strokeWidth="3" filter="url(#nodeGlow)" className="peak-node-anim" />;
                             }
                             return null;
                           })}

                           {coords.map((coord, i) => {
                             const step = Math.max(1, Math.floor(coords.length / 5));
                             const isLabel = i === 0 || i === coords.length - 1 || i % step === 0;
                             let anchor = 'middle';
                             if (i === 0) anchor = 'start';
                             if (i === coords.length - 1) anchor = 'end';
                             
                             return isLabel ? (
                               <text key={`dl-${i}`} x={coord.x} y="215" className="chart-axis-text" textAnchor={anchor}>
                                 {graphPoints[i].shortDate}
                               </text>
                             ) : null;
                           })}
                         </>
                       );
                    })()}
                 </svg>
               )}
            </div>
          </div>

          <div className="dash-matte-card split-horizon bento-span-1 bento-interactive flex-col glow-panel" onClick={() => setActiveBento('distribution')}>
            <div className="split-horizon-header flex-between custom-header-pad">
              <div>
                <h3 className="card-title text-white">Distribution</h3>
              </div>
              <span className="icon-xs text-muted"><IconExpand /></span>
            </div>
            
            <div className="split-horizon-content flex-col flex-1 relative p-20">
              {pieData.length === 0 ? (
                 <div className="empty-graph-state">No data.</div>
              ) : (
                <>
                  <div className="mx-auto mini-pie-wrapper">
                     {renderPieScene(false)}
                  </div>
                  <div className="mini-pie-legend mt-auto">
                    {pieData.slice(0, 3).map((cat, idx) => {
                      const isHovered = hoveredCat === cat.name;
                      const isDimmed = hoveredCat !== null && !isHovered;
                      return (
                        <div key={cat.name} className={`flex-between mb-xs legend-interactive ${isHovered ? 'lifted-legend' : ''} ${isDimmed ? 'dimmed-element' : ''}`}>
                           <div className="flex-align gap-sm pointer-events-none">
                              <div className="legend-color-swatch mini-swatch" style={{backgroundColor: colors[idx % colors.length]}}></div>
                              <span className="dash-xs-text text-white truncate-text max-w-120">{cat.name}</span>
                           </div>
                           <span className="dash-xs-text text-muted font-bold pointer-events-none">{cat.percentage.toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="dash-matte-card split-horizon bento-span-4 glow-panel mb-large">
             <div className="split-horizon-header flex-between">
                <div className="flex-align gap-sm">
                   <div className="icon-box-small text-secondary"><IconRepeat /></div>
                   <h3 className="card-title text-white m-0">Fixed Liabilities & Subscriptions</h3>
                </div>
                <span className="dash-xs-text text-muted font-bold">Active recurring logic</span>
             </div>
             
             <div className="split-horizon-content recurring-bento-content">
                <div className="recurring-stats">
                   <p className="dash-sm-label text-muted">GUARANTEED MONTHLY OUTFLOW</p>
                   <h2 className="dash-md-amount text-alert mt-xs">-₱{totalRecurring.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                   <p className="dash-xs-text text-muted m-0 mt-sm">Across {recurringTxs.length} active automated payments</p>
                </div>

                <div className="recurring-list-preview custom-scrollbar">
                   {topRecurring.length === 0 ? (
                      <p className="empty-graph-state flex-row">No recurring transactions established.</p>
                   ) : (
                      topRecurring.map((tx, idx) => (
                        <div 
                          key={idx} 
                          className="bento-tx-row clickable-tx"
                          onClick={() => {
                            sessionStorage.setItem('openSubscriptionId', tx.id);
                            if (setActiveTab) setActiveTab('subscriptions');
                          }}
                        >
                           <div className="flex-align gap-normal">
                              <span className="icon-xs text-muted"><IconRepeat /></span>
                              <div>
                                 <p className="bento-tx-name m-0 truncate-text max-w-180">{tx.description}</p>
                                 <p className="bento-tx-cat m-0">{tx.category}</p>
                              </div>
                           </div>
                           <p className="bento-tx-amount m-0 text-white font-bold">₱{Number(tx.amount).toLocaleString()}</p>
                        </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </div>

      ) : activeBento === 'trend' ? (

        <div className="analytics-grid expanded-view-anim">
          <div className="dash-matte-card split-horizon col-span-full" onClick={(e) => e.stopPropagation()}>
            <div className="split-horizon-header">
              <h2 className="card-title text-white card-title-lg">Detailed Outflow Trend</h2>
              <p className="dash-sm-text text-muted m-0 mt-xs">Click any node to reveal the transaction breakdown for that day.</p>
            </div>

            <div className="split-horizon-content flex-row trend-detailed-content">
              
              <div className="svg-graph-wrapper relative flex-1 graph-pad-wrapper">
                {graphPoints.length === 0 ? (
                  <div className="empty-graph-state">No transaction data available for this period.</div>
                ) : (
                  <div className="svg-graph-container" ref={graphRef}>
                    <svg viewBox="0 0 1000 350" preserveAspectRatio="none" className="analytics-svg">
                      <defs>
                        <linearGradient id="areaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="var(--accent-primary)" floodOpacity="0.5" />
                        </filter>
                      </defs>

                      <line x1="0" y1="40" x2="1000" y2="40" className="bg-grid-line" />
                      <text x="0" y="30" className="chart-axis-text">HIGH (₱{peakPoint.amount.toLocaleString(undefined, {maximumFractionDigits:0})})</text>
                      
                      <line x1="0" y1="175" x2="1000" y2="175" className="bg-grid-line" />
                      <text x="0" y="165" className="chart-axis-text">AVG</text>
                      
                      <line x1="0" y1="310" x2="1000" y2="310" stroke="var(--border-light)" strokeWidth="2" opacity="0.8" />
                      <text x="0" y="300" className="chart-axis-text">ZERO</text>

                      {(() => {
                        const { linePath, areaPath, coords } = createSmoothPath(graphPoints, 1000, 310);
                        return (
                          <>
                            <path d={areaPath} fill="url(#areaGlow)" className="graph-area-path-slow" />
                            
                            {coords.map((coord, i) => (
                              <g key={`vge-${i}`}>
                                <line x1={coord.x} y1={coord.y} x2={coord.x} y2="310" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
                                <line x1={coord.x} y1="307" x2={coord.x} y2="313" stroke="var(--text-muted)" strokeWidth="2" />
                              </g>
                            ))}

                            <path d={linePath} fill="none" className="graph-stroke-path-slow" pathLength="1000" filter="url(#neonGlow)" />
                            
                            {displayPoint && (
                               <g className="active-indicator">
                                 <line x1={displayPoint.x} y1={0} x2={displayPoint.x} y2="310" stroke="var(--accent-primary)" strokeWidth="2" opacity="0.8" />
                                 <circle cx={displayPoint.x} cy={displayPoint.y} r="8" fill="var(--theme-bg)" stroke="var(--accent-primary)" strokeWidth="4" filter="url(#neonGlow)" />
                               </g>
                            )}

                            {coords.map((coord, i) => {
                              const step = Math.max(1, Math.floor(coords.length / 7));
                              const isLabel = i === 0 || i === coords.length - 1 || i % step === 0;
                              let anchor = 'middle';
                              if (i === 0) anchor = 'start';
                              if (i === coords.length - 1) anchor = 'end';
                              
                              return (
                                <g key={i}>
                                  <g className="hover-point-group" 
                                     onMouseEnter={() => setHoveredPoint({ ...graphPoints[i], x: coord.x, y: coord.y })}
                                     onMouseLeave={() => setHoveredPoint(null)}
                                     onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePoint({ ...graphPoints[i], x: coord.x, y: coord.y });
                                    }}>
                                    <rect x={coord.x - (1000 / coords.length / 2)} y="0" width={1000 / coords.length} height="350" fill="transparent" />
                                  </g>
                                  
                                  {isLabel && (
                                    <text x={coord.x} y="335" className="chart-axis-text" textAnchor={anchor}>
                                      {graphPoints[i].shortDate}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>

              <div className={`trend-breakdown-panel custom-scrollbar ${activePoint ? 'active' : ''}`}>
                {activePoint ? (
                  <>
                    <p className="dash-sm-label text-muted">DATE SELECTED</p>
                    <h3 className="text-white m-0 mt-xs point-date-title">{activePoint.displayDate}</h3>
                    <h2 className="text-primary m-0 mt-sm mb-large">₱{activePoint.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                    
                    <p className="dash-sm-label text-muted mb-normal">TRANSACTIONS LOGGED ({activePoint.transactions.length})</p>
                    <div className="breakdown-tx-list">
                      {activePoint.transactions.map((tx, idx) => (
                        <div 
                          key={idx} 
                          className="breakdown-tx-item clickable-tx"
                          onClick={() => handleTransactionClick(tx)}
                        >
                           <div className="flex-between">
                             <span className="text-white font-bold truncate-text flex-1" title={tx.description}>{tx.description}</span>
                             <span className="text-primary font-bold ml-normal">₱{Number(tx.amount).toLocaleString()}</span>
                           </div>
                           <p className="text-muted m-0 mt-xs tx-cat-mini">{tx.category}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-graph-state text-center p-40">
                     <span className="icon-wrapper text-muted mb-normal"><IconExpand /></span>
                     <p>Click a node on the graph to view the detailed transaction breakdown.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      ) : (
        <div className="analytics-grid expanded-view-anim">
          <div className="dash-matte-card split-horizon col-span-full glow-panel">
            <div className="split-horizon-header">
              <h2 className="card-title text-white card-title-lg">Physical Category Distribution</h2>
            </div>
            
            <div className="split-horizon-content distribution-merged-content">
              <div className="donut-side py-20">
                {pieData.length === 0 ? <p className="text-muted">No data available.</p> : renderPieScene(true)}
              </div>

              <div className="legend-side custom-scrollbar">
                 {pieData.length === 0 ? (
                   <p className="text-muted text-center mt-large">Awaiting ledger data.</p>
                 ) : (
                   <div className="legend-flex-list">
                     {pieData.map((cat, index) => {
                       const isHovered = hoveredCat === cat.name;
                       const isDimmed = hoveredCat !== null && !isHovered;
                       
                       return (
                         <div 
                           key={cat.name} 
                           className={`legend-row-card ${isHovered ? 'lifted-legend' : ''} ${isDimmed ? 'dimmed-element' : ''}`}
                           onMouseEnter={() => setHoveredCat(cat.name)}
                           onMouseLeave={() => setHoveredCat(null)}
                         >
                           <div className="flex-align gap-normal pointer-events-none">
                             <div className="legend-color-swatch" style={{backgroundColor: colors[index % colors.length]}}></div>
                             <div>
                               <h4 className="legend-cat-name text-white m-0">{cat.name}</h4>
                               <p className="legend-cat-amount text-muted m-0 mt-xs">
                                 ₱{cat.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                               </p>
                             </div>
                           </div>
                           <h3 className="legend-cat-percent m-0 pointer-events-none" style={{color: colors[index % colors.length]}}>
                             {cat.percentage.toFixed(1)}%
                           </h3>
                         </div>
                       );
                     })}
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;