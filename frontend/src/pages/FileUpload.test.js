import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileUpload from "./FileUpload";

describe("FileUpload", () => {
  test(" Test to ensure TextInput FileName is present ", () => {
    render(<FileUpload />);
    const inputName = screen.getByLabelText("File Name");
    expect(inputName).toBeInTheDocument();
  });

  test(" Test to ensure FileInput is present ", () => {
    render(<FileUpload />);
    const inputFile = screen.getByLabelText("File");
    expect(inputFile).toBeInTheDocument();
  });

  test(" Test to ensure Button is present ", () => {
    render(<FileUpload />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  test(" Test to ensure Filename textinput is working as expected ", () => {
    render(<FileUpload />);
    const inputName = screen.getByLabelText("File Name");
    userEvent.type(inputName, "testfile");
    expect(inputName).toHaveValue("testfile");

    userEvent.type(inputName, "");
    expect(inputName).toHaveValue("");
  });

  test(" Test to ensure FileInput is working as expected ", () => {
    render(<FileUpload />);
    const inputFile = screen.getByLabelText("File");
    userEvent.upload(inputFile, new File(["testfile"], "testfile.txt"));
    expect(inputFile.files[0].name).toBe("testfile.txt");
  });
});
