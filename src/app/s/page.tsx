import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

'use client';


export default function SharePage() {
    // People will click the preview and land here.
    // We immediately redirect them to the main voting page.
    const router = useRouter();

    useEffect(() => {
        router.push('/');
    }, [router]);

    return null;
}