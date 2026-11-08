// Reject reads that started before a write, a workspace change or a newer read.
export class SyncGuard {
  private generation=0;
  private request=0;
  private revision=-1;
  invalidate(reset=false){this.generation++;if(reset)this.revision=-1;}
  start(){return {generation:this.generation,request:++this.request};}
  accept(ticket:{generation:number;request:number},revision:number){
    if(ticket.generation!==this.generation||ticket.request!==this.request||revision<this.revision)return false;
    this.revision=revision;return true;
  }
  current(ticket:{generation:number;request:number}){return ticket.generation===this.generation&&ticket.request===this.request;}
  commit(revision:number){this.invalidate();this.revision=revision;}
}
