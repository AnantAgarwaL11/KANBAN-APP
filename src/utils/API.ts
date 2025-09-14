export default async function ApiCall(
  url: string,
  method: string = 'GET',
  body?: any,
) {
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${url}`, fetchOptions);

  // Check if response is ok and content-type is JSON
  if (!response.ok) {
    const errorData = await response.text().catch(() => null);
    throw new Error(
      `HTTP error! status: ${response.status}${errorData ? `, message: ${errorData}` : ''}`
    );
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Expected JSON but got:', text);
    throw new Error(`Response is not JSON: ${text.substring(0, 100)}`);
  }

  try {
    return await response.json();
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Invalid JSON response from server');
  }
}
