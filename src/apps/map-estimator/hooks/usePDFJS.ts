import { useState, useEffect } from 'react';

const usePDFJS = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.pdfjsLib) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setIsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  return isLoaded;
};

export default usePDFJS;