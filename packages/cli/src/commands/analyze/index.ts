import { Command } from 'commander'
import { runAnalyze } from './analyze.js'

export const analyzeCommand = new Command('analyze')
  .description('Analyze project and suggest improvements')
  .option('-v, --verbose', 'Show detailed analysis')
  .option('--json', 'Output in JSON format')
  .action(runAnalyze)
