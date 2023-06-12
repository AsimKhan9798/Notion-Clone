import React, { useEffect, useRef, useState } from "react";
import ContentEditable from "react-contenteditable";
import "../css/styles.css";
import SelectMenu from "./selectMenu";
import { getCaretCoordinates, setCaretToEnd } from "./caretHelpers";
import axios from "axios";
import { CMD_KEY } from "../utils/Constants";

const EditableBlock = (props) => {
  console.log("props", props);
  const [htmlBackup, setHtmlBackup] = useState(null);
  const htmlRef = useRef(props.html || "");
  const [tag, setTag] = useState("p");
  const [previousKey, setPreviousKey] = useState("");
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState(false);
  const [selectMenuPosition, setSelectMenuPosition] = useState({ x: null, y: null });


  const contentEditable = useRef(null);

  // useEffect(() => {
  //   setTag(props.tag);
  // }, []);

  useEffect(() => {
    const htmlChanged = htmlRef.current !== props.html;
    const tagChanged = tag !== props.tag;
    if (htmlChanged || tagChanged) {
      props.updatePage({ id: props.id, html: htmlRef.current, tag });
    }
  }, [tag, props.html, props.tag]);

  const onChangeHandler = (e) => {
    const inputValue = e.target.value;
    let updatedValue = inputValue;

    if (!selectMenuIsOpen) {
      const slashIndex = inputValue.lastIndexOf(CMD_KEY);
      const nextCharacterIndex = slashIndex + CMD_KEY.length;

      if (slashIndex !== -1 && nextCharacterIndex < inputValue.length) {
        updatedValue =
          inputValue.slice(0, slashIndex) +
          inputValue.slice(nextCharacterIndex);
      }
    }

    htmlRef.current = updatedValue;
    console.log(updatedValue);
  };
  const onKeyDownHandler = (e) => {
    if (e.key === CMD_KEY) {
      setHtmlBackup(htmlRef.current);
    }
    if (e.key === "Enter") {
      if (previousKey !== "Shift" && !selectMenuIsOpen) {
        if (!e.shiftKey) {
          e.preventDefault();
          props.addBlock({ id: props.id, ref: contentEditable.current });
          // Set focus back to contentEditable after Enter is pressed
          contentEditable.current.focus();
          if (props.html.length > 0) {
            editBlock();
          } else {
            createBlock();
          }
        }
      }
    }
    if (e.key === "Backspace" && !htmlRef.current) {
      e.preventDefault();
      props.deleteBlock({ id: props.id, ref: contentEditable.current });

      deleteBlock();
      // Call props.deleteBlockHandler with current block object
    }
    setPreviousKey(e.key);
  };

  const onKeyUpHandler = (e) => {
    if (e.key === CMD_KEY) {
      if (!selectMenuIsOpen) {
        openSelectMenuHandler();
      }
    }
  };

  const openSelectMenuHandler = () => {
    const { x, y } = getCaretCoordinates();
    setSelectMenuPosition({ x, y });
    setSelectMenuIsOpen(true);
    document.addEventListener("click", closeSelectMenuHandler.focus);
  };

  const closeSelectMenuHandler = () => {
    setSelectMenuIsOpen(false);
    setSelectMenuPosition({ x: null, y: null });
    document.removeEventListener("click", closeSelectMenuHandler);
    contentEditable.current.focus();
    setCaretToEnd(contentEditable.current);
  };

  const tagSelectionHandler = (tag) => {
    setTag(tag);
    htmlRef.current = htmlRef.current.replace(CMD_KEY, ""); // Remove the CMD_KEY ("/") character from the HTML content
    closeSelectMenuHandler();
    setTimeout(() => {
      // Set focus back
      contentEditable.current.focus();
      // Set the cursor to the end of the content
      setCaretToEnd(contentEditable.current);
    }, 0);
  };

  //DELETE REQUEST

  const deleteBlock = async () => {
    try {
      await axios
        .delete(`http://localhost:1337/api/blocks/${props.id}`)
        .then((response) => {
          const success = response.data;
          if (success) {
            // props.fetchData();
          }
          props.deleteBlock({ id: props.id, ref: contentEditable.current });
        })
        .catch((error) => {
          console.log(error);
        });
    } catch (error) {
      console.error(error);
    }
  };

  //Update Request
  const editBlock = async () => {
    const block = {
      html: htmlRef.current,
      tag: props.tag,
    };
    try {
      await axios
        .put(`http://localhost:1337/api/blocks/${props.id}`, {
          data: block,
        })
        .then((response) => {
          console.log(response);
          const success = response.data;
          if (success) {
            props.updatePage({ id: props.id, html: htmlRef.current, tag });
          }
        });
    } catch (error) {
      console.error(error);
    }
  };

  //POST REQUEST1
  const createBlock = async () => {
    if (htmlBackup == null) {
      const block = {
        html: htmlRef.current,
        tag: props.tag,
      };

      await axios
        .post(
          "http://localhost:1337/api/blocks",
          { data: block },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
        .then((response) => {
          console.log("Response:", response.data);
        });
    } else {
      // Restore the original html if no menu item was selected
      htmlRef.current.tag = htmlBackup;
      setHtmlBackup(null);
    }
  };

  return (
    <>
      {selectMenuIsOpen && (
        <SelectMenu
         position={selectMenuPosition}
          onSelect={tagSelectionHandler}
          close={closeSelectMenuHandler}
        />
      )}
      <ContentEditable
        className="Block"
        innerRef={contentEditable}
        html={htmlRef.current}
        tagName={tag}
        onChange={onChangeHandler}
        onKeyDown={onKeyDownHandler}
        onKeyUp={onKeyUpHandler}
      />
    </>
  );
};

export default EditableBlock;
