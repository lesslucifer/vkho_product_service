import { parseDate } from "src/common/partDateTime";
import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class WarehouseGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    code: string;

    @Column()
    userId: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    createDate: Date;

    @Column({ nullable: true })
    status: string;

    @BeforeInsert()
    private beforeInsert() {
      this.status = 'ENABLE';
      this.createDate = parseDate(new Date());
    }
}
