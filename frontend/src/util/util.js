function formatMsg(type, data){
  return JSON.stringify({type, data});
}

export default formatMsg;
