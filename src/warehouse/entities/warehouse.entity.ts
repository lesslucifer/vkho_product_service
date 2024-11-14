import { parseDate } from "src/common/partDateTime";
import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { WarehouseStatus } from "../enum/status.enum";

@Entity()
export class Warehouse {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    code: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    acreage: number;

    @Column()
    createDate: Date;

    @Column({ enum: WarehouseStatus, nullable: true })
    status: string;

    @Column("simple-array", {nullable: true})
    userIds: string[];

    @BeforeInsert()
    private beforeInsert() {
      this.status = WarehouseStatus.ENABLE;
      this.createDate = parseDate(new Date());
    }
}
