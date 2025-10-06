-- Bandar Scanner Database Schema

-- Stock data table
CREATE TABLE IF NOT EXISTS stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  change_percent DECIMAL(5,2) NOT NULL,
  volume BIGINT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_timestamp (symbol, timestamp),
  INDEX idx_timestamp (timestamp)
);

-- Bandar signals table
CREATE TABLE IF NOT EXISTS bandar_signals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  signal ENUM('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL') NOT NULL,
  signal_strength DECIMAL(5,2) NOT NULL,
  bandar_signal ENUM('ACCUMULATION', 'DISTRIBUTION', 'NEUTRAL') NOT NULL,
  bandar_confidence INT NOT NULL,
  bandar_pattern TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_timestamp (symbol, timestamp),
  INDEX idx_bandar_signal (bandar_signal),
  INDEX idx_confidence (bandar_confidence)
);

-- Technical indicators table
CREATE TABLE IF NOT EXISTS technical_indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  rsi DECIMAL(5,2),
  sma10 DECIMAL(10,2),
  ema5 DECIMAL(10,2),
  vwap DECIMAL(10,2),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_timestamp (symbol, timestamp)
);

-- Market sessions table
CREATE TABLE IF NOT EXISTS market_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  is_open BOOLEAN NOT NULL,
  session_type ENUM('REGULAR', 'PRE_MARKET', 'AFTER_HOURS') DEFAULT 'REGULAR',
  ihsg_trend ENUM('BULLISH', 'BEARISH', 'NEUTRAL'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);