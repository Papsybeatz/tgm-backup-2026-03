import React, { useState } from 'react';
import useTestAI from '../hooks/useTestAI';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

const DebugPanel = () => {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState(null);
  const { data, error, isLoading, refetch, isFetching } = useTestAI({ enabled: false });

  const handleTestAI = async () => {
    setLocalError(null);
    const previous = queryClient.getQueryData(['test-ai']);
    queryClient.setQueryData(['test-ai'], { response: 'Thinking…' });
    try {
      await refetch();
    } catch (err) {
      queryClient.setQueryData(['test-ai'], previous);
      setLocalError(err?.message || 'Request failed');
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80 rounded-lg border bg-white p-3 shadow-lg">
      <h4 className="mb-2 text-sm font-semibold">Debug Panel</h4>
      <div className="flex items-center gap-2">
        <button
          onClick={handleTestAI}
          disabled={isFetching}
          className={
            `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ` +
            (isFetching ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-wait' : 'border-slate-200 bg-white hover:bg-slate-50')
          }
        >
          {isFetching ? (
            <>
              <svg className="h-3 w-3 animate-spin text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Testing…
            </>
          ) : (
            'Test AI'
          )}
        </button>
        <button
          onClick={() => {
            queryClient.invalidateQueries(['test-ai']);
          }}
          className="rounded-full border px-3 py-1 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {localError && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <strong>Error:</strong> {localError}
        </div>
      )}

      <AnimatePresence>
        {data && data.response && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="mt-3 rounded-md border bg-slate-50 p-2 text-xs text-slate-700"
            key="ai-response-debug"
          >
            <div className="font-semibold text-xs text-slate-500">AI response</div>
            <div className="mt-1 text-sm">{data.response}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugPanel;
