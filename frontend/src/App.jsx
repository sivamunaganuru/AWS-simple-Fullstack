import React, { useState,useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as Yup from 'yup';
import axios from 'axios';

const schema = Yup.object().shape({
  inputName: Yup.string().required('Filename is required.'),
  inputFile: Yup.mixed().required('A file is required.').nullable(),
});

function App() {
  const [inputName, setInputName] = useState('');
  const [inputFile, setInputFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    inputName: '',
    inputFile: '',
  });

  useEffect(() => {
    const validateField = async (field, value) => {
      try {
        await schema.validateAt(field, { [field]: value });
        setErrors((prevErrors) => ({ ...prevErrors, [field]: '' }));
      } catch (error) {
        setErrors((prevErrors) => ({ ...prevErrors, [field]: error.message }));
      }
    };

    validateField('inputName', inputName);
    validateField('inputFile', inputFile);
  }, [inputName, inputFile]);


  const getPresignedUrl = async (filename, filetype) => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/upload`, {
      params: { filename, filetype },
    });
    // Axios uses .status to indicate HTTP status codes
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error('Failed to get pre-signed URL');
    }
  };
  
  const uploadFile = async (url, file) => {
    const response = await axios.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
    if (response.status !== 200) {
      throw new Error('Upload failed');
    }
  };
  
  const saveFileDetails = async (inputName, bucketName, key) => {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/dynamoInsert`, {
      inputText: inputName,
      inputFilePath: `${bucketName}/${key}`,
    });
    if (response.status === 200) {
      toast.success('File details saved successfully!');
    } else {
      throw new Error('Failed to save file details');
    }
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
  
    try {
      await schema.validate({ inputName, inputFile }, { abortEarly: false });
      setErrors({});
  
      const { url, key, bucketName } = await getPresignedUrl(inputName, inputFile.type);
      await uploadFile(url, inputFile);
      await saveFileDetails(inputName, bucketName, key);
  
      // Resetting form state on success
      setInputName('');
      // setInputFile(null);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      if (error.inner) {
        // Yup validation errors
        const validationErrors = error.inner.reduce((acc, curr) => {
          acc[curr.path] = curr.message;
          return acc;
        }, {});
        setErrors(validationErrors);
      } else {
        console.error(error);
        toast.error(error.message);
      }
    }
  };
  


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className='text-xl md:text-2xl lg:text-3xl text-center font-bold
       text-blue-600 shadow-lg p-5 rounded-lg'>
        Upload Your Text File
      </h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="textInput">
            Filename
          </label>
          <input
            className="shadow appearance-none border rounded w-full p-3 text-gray-700
             leading-tight focus:outline-none focus:shadow-outline"
            id="textInput"
            type="text"
            placeholder="Enter filename"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
          />
          {errors.inputName && <p className="text-red-500 text-xs italic">{errors.inputName}</p>}
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fileInput">
            Select File
          </label>
          <input
            className="shadow appearance-none border rounded w-full p-3 text-gray-700
             leading-tight focus:outline-none focus:shadow-outline"
            id="fileInput"
            type="file"
            accept=".txt"
            onChange={(e) => setInputFile(e.target.files[0])}
          />
          {errors.inputFile && <p className="text-red-500 text-xs italic">{errors.inputFile}</p>}
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4
            rounded focus:outline-none focus:shadow-outline 
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
      <ToastContainer />
    </div>
  );
}

export default App;
