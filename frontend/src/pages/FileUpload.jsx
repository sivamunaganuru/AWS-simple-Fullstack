import {
  Card,
  TextInput,
  Label,
  Button,
  Alert,
  FileInput,
} from "flowbite-react";
import { Toast } from "flowbite-react";
import { HiCheck, HiExclamation, HiX } from "react-icons/hi";
import { AiOutlineLoading } from "react-icons/ai";
import React, { useState, useRef } from "react";
import axios from "axios";
import { uploadData } from 'aws-amplify/storage';
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

const FileUpload = () => {
  const [inputName, setInputName] = useState("");
  const [inputFile, setInputFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef(null);

  const getPresignedUrl = async (filename, filetype) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/upload`,
        {
          params: { filename, filetype },
        }
      );
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error(
        "Failed to get pre-signed URL: Check the URL in the .env file."
      );
    }
  };

  const uploadFile = async (url, file) => {
    // try {
    //   const response = await axios.put(url, file, {
    //     headers: {
    //       "Content-Type": file.type,
    //     },
    //   });
    // } catch (error) {
    //   console.error(error);
    //   throw new Error("Uploading File to S3 failed.");
    // }

    try {
      const result = await uploadData({
        key: inputName,
        data: file,
        options: {
          accessLevel: 'guest',
          onProgress : ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              console.log(
                `Upload progress ${
                  Math.round((transferredBytes / totalBytes) * 100)
                } %`
              );
            }
          },
        }
      }).result;
      console.log('Succeeded: ', result);
    } catch (error) {
      console.log('Error : ', error);
    }
  };

  const saveFileDetails = async (inputName, bucketName, key) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/dynamoInsert`,
        {
          inputText: inputName,
          inputFilePath: `${bucketName}/${key}`,
        }
      );
      setSuccessMessage("File uploaded successfully!");
    } catch (error) {
      console.error(error);
      throw new Error(
        "Failed to save file details in DynamoDB. Check the API URL in the .env file."
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      setErrorMessage("");
      setSuccessMessage("");
      // const { url, key, bucketName } = await getPresignedUrl(
      //   inputName,
      //   inputFile.type
      // );
      await uploadFile(inputFile);
      await saveFileDetails(inputName, bucketName, key);

      setInputName("");
      fileInputRef.current.value = "";
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <Card className="max-w-md mx-auto">
        <h1 level={5} className="mb-4 text-center text-xl md:text-2xl lg:text-3xl font-bold">
          Upload Your Text File
        </h1>
        {errorMessage && (
          <Toast>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
              <HiX className="h-5 w-5" />
            </div>
            <div className="ml-3 text-sm font-normal">{errorMessage}</div>
            <Toast.Toggle onDismiss={() => setErrorMessage("")} />
          </Toast>
        )}
        {successMessage && (
          <Toast>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200">
              <HiCheck className="h-5 w-5" />
            </div>
            <div className="ml-3 text-sm font-normal">{successMessage}</div>
            <Toast.Toggle onDismiss={() => setSuccessMessage("")} />
          </Toast>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="textInput">Filename</Label>
            <TextInput
              id="textInput"
              type="text"
              placeholder="Enter filename"
              required
              shadow
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
            />
          </div>

          <div>
          <div className="mb-2 block">
            <Label htmlFor="fileInput">Select File</Label>
          </div>
            <FileInput
              id="fileInput"
              type="file"
              required
              accept=".txt"
              ref={fileInputRef}
              helperText="Only .txt files are allowed"
              onChange={(e) => setInputFile(e.target.files[0])}
            />
          </div>
        
          <div className="flex items-center justify-center">
            <Button
              type="submit"
              disabled={loading}
              gradientDuoTone="cyanToBlue"
              size="md"
              isProcessing={loading}
              processingSpinner={
                <AiOutlineLoading className="h-6 w-6 animate-spin" />
              }
            >
              {loading ? "Submitting" : "Submit"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FileUpload;
