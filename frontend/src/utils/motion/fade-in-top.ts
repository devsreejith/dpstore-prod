export function fadeInTop (duration:number = 0.5) {
  return {
    from: { 
      opacity: 0,
      transition: {
        type: 'easeInOut',
				duration: duration,
      } 
    },
    to: { 
      opacity: 1,
      transition: {
        type: 'easeInOut',
				duration: duration,
      } 
    },
  }
}