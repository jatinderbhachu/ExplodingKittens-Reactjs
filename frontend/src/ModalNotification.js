import React, { useEffect, useRef} from "react";

function ModalNotification(props) {
  const { duration, msg } = props;
  const notificationRef = useRef(null);

  const dropDownAnim = [
    {top: '-14%', opacity: 1.0}, 
    {top: '0%', offset: 0.1}, 
    {top: '0%', offset: 0.9}, 
    {opacity: 1.0, offset: 0.9}, 
    {top: '-14%', opacity: 0.0}, 
  ];

  const animTiming = {
    duration: duration*1000,
    iterations: 1
  };

  useEffect( () => {
    notificationRef.current.animate(dropDownAnim, animTiming);
  }, [props.msg]);

  return (
    <div className="ModalNotification" ref={notificationRef}>{msg}</div>
  );

}

export default ModalNotification;
