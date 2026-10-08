import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
// Данные принадлежат странице; отмена запроса не даёт старому ответу заменить новый.
export function useApi(path) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState();
    const reload = useCallback(() => setAttempt(value => value + 1), []);
    useEffect(() => {
        const controller = new AbortController();
        api(path, { signal: controller.signal })
            .then(data => { if (!controller.signal.aborted)
            setResult({ path, attempt, data }); })
            .catch((error) => { if (!controller.signal.aborted)
            setResult({ path, attempt, error }); });
        return () => controller.abort();
    }, [path, attempt]);
    const current = result?.path === path && result.attempt === attempt ? result : undefined;
    return { data: current?.data, error: current?.error, loading: !current, reload };
}
