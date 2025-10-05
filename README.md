# Next.js Scalping Dashboard 📈

Indonesian Stock Scalping Dashboard with real-time IDX stock analysis, technical indicators, trading signals, and backtesting for day trading strategies.

![Next.js Scalping Dashboard](./banner.png)

## 🚀 Features

### 📊 Real-time Stock Data
- **IDX Integration**: Live data from Indonesia Stock Exchange
- **Yahoo Finance API**: Real-time price updates
- **Volume Analysis**: Track trading volume and market activity
- **Market Context**: IHSG trend analysis

### 📈 Technical Analysis
- **RSI (Relative Strength Index)**: Optimized for day trading (9-period)
- **Moving Averages**: SMA20, EMA12 for trend analysis
- **MACD**: Fast signals for scalping (5/13/4 periods)
- **Bollinger Bands**: Tight bands for scalping (10-period, 1.5 stdDev)
- **Stochastic**: Fast stochastic for day trading (5/2 periods)

### 🎯 Trading Signals
- **Smart Signal Generation**: Multi-indicator analysis
- **Risk Management**: ATR, volatility, support/resistance
- **Signal Validation**: Volume confirmation and false signal protection
- **Signal Strength**: Scoring system (-5 to +5)

### 🔄 Backtesting System
- **Strategy Testing**: RSI, MA Crossover, Combined strategies
- **Performance Metrics**: Total return, win rate, alpha, max drawdown
- **Trade History**: Detailed transaction log
- **Risk Analysis**: Comprehensive risk assessment

### 🔐 Authentication
- **Demo Accounts**: 
  - Admin: `admin@demo.com` / `admin123`
  - User: `user@demo.com` / `user123`
- **Protected Routes**: Secure dashboard access
- **Role-based Access**: Different permission levels

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Toggle between light/dark themes
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Interactive Charts**: ApexCharts integration
- **Filtering & Sorting**: Advanced data manipulation

## 🛠️ Tech Stack

- **Framework**: Next.js 15.2.3
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: ApexCharts, Recharts
- **APIs**: Yahoo Finance 2, IDX API
- **Technical Analysis**: technicalindicators library
- **Authentication**: Custom auth context
- **Deployment**: Vercel-ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/agustra/next-js-scalping.git
cd next-js-scalping
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start development server**
```bash
npm run dev
# or
yarn dev
```

4. **Open browser**
Navigate to `http://localhost:3000`

### Build for Production
```bash
npm run build
npm start
```

## 📱 Usage

### Login
Use demo credentials:
- **Admin**: `admin@demo.com` / `admin123`
- **User**: `user@demo.com` / `user123`

### Dashboard Features
1. **Stock Analysis**: View real-time IDX stock data with technical indicators
2. **Signal Filtering**: Filter by BUY/SELL/HOLD signals
3. **Price Range**: Set custom price filters
4. **Backtesting**: Test trading strategies with historical data
5. **Risk Management**: Analyze volatility and risk metrics

## 🔧 Configuration

### API Endpoints
- `/api/yahoo` - Real-time stock data with technical analysis
- `/api/backtest` - Strategy backtesting
- `/api/historical` - Historical price data

### Caching
- **Memory Cache**: 1-minute cache for day trading
- **Auto-cleanup**: Removes expired cache entries
- **Rate Limiting**: Batch processing to avoid API limits

## 📊 Trading Strategies

### RSI Strategy
- **Buy**: RSI < 30 (oversold)
- **Sell**: RSI > 70 (overbought)
- **Optimized**: 9-period RSI for faster signals

### MA Crossover
- **Golden Cross**: SMA20 > SMA50 (bullish)
- **Death Cross**: SMA20 < SMA50 (bearish)

### Combined Strategy
- **Multi-indicator**: RSI + MA + Volume confirmation
- **Risk-adjusted**: Volatility and support/resistance levels

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application is for educational and research purposes only. It is not financial advice. Always do your own research and consult with financial professionals before making investment decisions.

## 🙏 Acknowledgments

- [TailAdmin](https://tailadmin.com) - Base dashboard template
- [Yahoo Finance API](https://github.com/gadicc/node-yahoo-finance2) - Stock data provider
- [Technical Indicators](https://github.com/anandanand84/technicalindicators) - TA calculations
- [IDX](https://www.idx.co.id) - Indonesia Stock Exchange data

## 📞 Support

If you find this project helpful, please give it a ⭐ on GitHub!

For questions or support, please open an issue on GitHub.

---

**Happy Trading! 📈💰**