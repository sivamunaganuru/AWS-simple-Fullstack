import React, { useState,useRef } from 'react';
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
  const fileInputRef = useRef(null);

  const handleInputNameChange = async (event) => {
    const newName = event.target.value;
    setInputName(newName);
    try {
      await schema.validateAt("inputName", { inputName: newName });
      setErrors((prevState) => ({ ...prevState, inputName: '' }));
    } catch (error) {
      setErrors((prevState) => ({ ...prevState, inputName: error.message }));
    }
  };

  const handleFileInputChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setInputFile(null);
      setErrors((prevState) => ({ ...prevState, inputFile: 'A file is required.' }));
      return;
    }
    try {
      await schema.validateAt("inputFile", { inputFile: file });
      setInputFile(file);
      setErrors((prevState) => ({ ...prevState, inputFile: '' }));
    } catch (error) {
      setInputFile(null);
      setErrors((prevState) => ({ ...prevState, inputFile: error.message }));
    }
  };
  
  
  const getPresignedUrl = async (filename, filetype) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/upload`, {
        params: { filename, filetype },
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to get pre-signed URL: Check the URL in the .env file.');
    }
  };
  
  const uploadFile = async (url, file) => {
    try{
      const response = await axios.put(url, file, {
        headers: {
          'Content-Type': file.type,
        },
      });
    } catch (error) {
      throw new Error('Uploading File to S3 failed.');
    }
  };
  
  const saveFileDetails = async (inputName, bucketName, key) => {

    try{
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/dynamoInsert`, {
        inputText: inputName,
        inputFilePath: `${bucketName}/${key}`,
      });
      toast.success('File uploaded successfully!');
    }catch (error) {
      throw new Error('Failed to save file details in DynamoDB. Check the API URL in the .env file.');
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
  
      setInputName('');
      fileInputRef.current.value = '';
      setLoading(false);
    } catch (error) {
      setLoading(false);
       // Yup validation errors
      if (error.inner) {
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
            onChange={handleInputNameChange}
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
            ref={fileInputRef}
            onChange={handleFileInputChange}
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
