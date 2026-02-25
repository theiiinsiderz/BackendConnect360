import axios from 'axios';

async function main() {
    try {
        const response = await axios.post('http://localhost:5000/api/tags/activate', {
            code: 'TAG-3GTH9EC4',
            nickname: 'Test Car',
            plateNumber: 'MH12AB1234'
        });
        console.log('Response:', response.data);
    } catch (error: any) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

main();
