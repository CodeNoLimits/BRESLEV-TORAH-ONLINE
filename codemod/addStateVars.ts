import fs from 'fs';

const filePath = 'client/src/App.tsx';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('const [isStreaming')) {
  code = code.replace(
    "const [streamingText, setStreamingText] = useState('');",
    "const [streamingText, setStreamingText] = useState('');\n  const [isStreaming, setIsStreaming] = useState(false);\n  const [isLoading, setIsLoading] = useState(false);"
  );
  fs.writeFileSync(filePath, code);
}
